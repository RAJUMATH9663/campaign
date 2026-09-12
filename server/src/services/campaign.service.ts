import { Channel, Contact, RecipientSource } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { checkEligibility } from "./compliance.service";
import { renderTemplate } from "../utils/template";
import { campaignQueue } from "../jobs/queue";

interface ResolveRecipientsParams {
  userId: string;
  source: RecipientSource;
  tags?: string[];
  groupId?: string;
  contactIds?: string[];
  channel: Channel;
}

export async function resolveRecipients({
  userId,
  source,
  tags,
  groupId,
  contactIds,
  channel,
}: ResolveRecipientsParams) {
  let contacts: Contact[];

  if (source === "ALL") {
    contacts = await prisma.contact.findMany({ where: { userId } });
  } else if (source === "TAGS" && tags?.length) {
    contacts = await prisma.contact.findMany({
      where: { userId, tags: { hasSome: tags } },
    });
  } else if (source === "GROUP" && groupId) {
    contacts = await prisma.contact.findMany({
      where: { userId, groups: { some: { groupId } } },
    });
  } else if (source === "SELECTED" && contactIds?.length) {
    contacts = await prisma.contact.findMany({
      where: { userId, id: { in: contactIds } },
    });
  } else {
    contacts = [];
  }

  const eligibility = await checkEligibility(contacts, channel);
  return {
    eligible: eligibility.filter((e) => e.eligible),
    excluded: eligibility.filter((e) => !e.eligible),
  };
}

export async function createCampaign(params: {
  userId: string;
  name: string;
  channel: Channel;
  message: string;
  source: RecipientSource;
  tags?: string[];
  groupId?: string;
  contactIds?: string[];
  scheduledAt?: Date;
}) {
  const { eligible, excluded } = await resolveRecipients({
    userId: params.userId,
    source: params.source,
    tags: params.tags,
    groupId: params.groupId,
    contactIds: params.contactIds,
    channel: params.channel,
  });

  const campaign = await prisma.campaign.create({
    data: {
      userId: params.userId,
      name: params.name,
      channel: params.channel,
      message: params.message,
      status: params.scheduledAt ? "SCHEDULED" : "DRAFT",
      recipientSource: params.source,
      filterTags: params.tags || [],
      groupId: params.groupId,
      scheduledAt: params.scheduledAt,
    },
  });

  await prisma.campaignRecipient.createMany({
    data: [
      ...eligible.map((e) => ({
        campaignId: campaign.id,
        contactId: e.contact.id,
        eligible: true,
      })),
      ...excluded.map((e) => ({
        campaignId: campaign.id,
        contactId: e.contact.id,
        eligible: false,
        excludeReason: e.reason,
      })),
    ],
  });

  return { campaign, eligibleCount: eligible.length, excludedCount: excluded.length };
}

/** Moves a DRAFT/SCHEDULED campaign into RUNNING and enqueues messages. */
export async function launchCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { recipients: { where: { eligible: true }, include: { contact: true } } },
  });

  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    throw new Error(`Cannot launch campaign in status ${campaign.status}`);
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  for (const recipient of campaign.recipients) {
    const content = renderTemplate(campaign.message, {
      name: recipient.contact.name,
      phone: recipient.contact.phone,
    });

    const message = await prisma.message.create({
      data: {
        campaignId,
        contactId: recipient.contact.id,
        channel: campaign.channel,
        content,
        status: "QUEUED",
      },
    });

    await campaignQueue.add(
      "send-message",
      { messageId: message.id },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );
  }

  return campaign;
}

export async function pauseCampaign(campaignId: string) {
  return prisma.campaign.update({ where: { id: campaignId }, data: { status: "PAUSED" } });
}

export async function resumeCampaign(campaignId: string) {
  return launchCampaign(campaignId);
}

export async function cancelCampaign(campaignId: string) {
  await prisma.message.updateMany({
    where: { campaignId, status: { in: ["PENDING", "QUEUED"] } },
    data: { status: "FAILED", error: "Campaign cancelled" },
  });
  return prisma.campaign.update({ where: { id: campaignId }, data: { status: "CANCELLED" } });
}
