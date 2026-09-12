import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  createCampaign,
  resolveRecipients,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
} from "../services/campaign.service";

export async function listCampaigns(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true, recipients: true } } },
  });
  res.json(campaigns);
}

export async function getCampaign(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      recipients: { include: { contact: true } },
      messages: true,
    },
  });
  if (!campaign) throw new AppError("Campaign not found", 404);
  res.json(campaign);
}

/** Preview eligible/excluded recipients before creating the campaign
 *  (Step 4 of the wizard: compliance check). */
export async function previewRecipients(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { source, tags, groupId, contactIds, channel } = req.body;
  const { eligible, excluded } = await resolveRecipients({
    userId,
    source,
    tags,
    groupId,
    contactIds,
    channel,
  });
  res.json({
    eligibleCount: eligible.length,
    excludedCount: excluded.length,
    eligible: eligible.map((e) => ({ id: e.contact.id, name: e.contact.name, phone: e.contact.phone })),
    excluded: excluded.map((e) => ({ id: e.contact.id, name: e.contact.name, reason: e.reason })),
  });
}

export async function create(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { name, channel, message, source, tags, groupId, contactIds, scheduledAt } = req.body;
  if (!name || !channel || !message) throw new AppError("name, channel and message are required");

  const result = await createCampaign({
    userId,
    name,
    channel,
    message,
    source,
    tags,
    groupId,
    contactIds,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  });

  await prisma.auditLog.create({
    data: { userId, action: "CAMPAIGN_CREATED", entity: "Campaign", entityId: result.campaign.id },
  });

  res.status(201).json(result);
}

async function assertOwned(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw new AppError("Campaign not found", 404);
  return campaign;
}

export async function launch(req: AuthedRequest, res: Response) {
  await assertOwned(req.userId!, req.params.id);
  const campaign = await launchCampaign(req.params.id);
  await prisma.auditLog.create({
    data: { userId: req.userId!, action: "CAMPAIGN_LAUNCHED", entity: "Campaign", entityId: campaign.id },
  });
  res.json(campaign);
}

export async function pause(req: AuthedRequest, res: Response) {
  await assertOwned(req.userId!, req.params.id);
  const campaign = await pauseCampaign(req.params.id);
  res.json(campaign);
}

export async function resume(req: AuthedRequest, res: Response) {
  await assertOwned(req.userId!, req.params.id);
  const campaign = await resumeCampaign(req.params.id);
  res.json(campaign);
}

export async function cancel(req: AuthedRequest, res: Response) {
  await assertOwned(req.userId!, req.params.id);
  const campaign = await cancelCampaign(req.params.id);
  await prisma.auditLog.create({
    data: { userId: req.userId!, action: "CAMPAIGN_CANCELLED", entity: "Campaign", entityId: campaign.id },
  });
  res.json(campaign);
}
