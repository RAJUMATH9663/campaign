import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "./queue";
import { prisma } from "../utils/prisma";
import { getSMSProvider, getWhatsAppProvider } from "../providers/providerFactory";

const BATCH_SIZE = Number(process.env.SEND_BATCH_SIZE || 20);

/**
 * Worker limiter (`limiter`) enforces a rate limit across all jobs so we
 * never exceed the messaging provider's allowed throughput, regardless of
 * how many messages are queued.
 */
const worker = new Worker(
  "campaign-messages",
  async (job) => {
    const { messageId } = job.data as { messageId: string };

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { contact: true, campaign: true },
    });
    if (!message) return;

    // Respect pause/cancel: skip sending if campaign is no longer RUNNING.
    if (message.campaign.status !== "RUNNING") {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "PENDING" },
      });
      return;
    }

    const provider = message.channel === "SMS" ? getSMSProvider() : getWhatsAppProvider();

    const result =
      message.channel === "SMS"
        ? await provider.sendMessage(message.contact.phone, message.content)
        : await (provider as any).sendMessage(message.contact.phone, message.content);

    if (result.success) {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "SENT",
          providerId: provider.name,
          providerMsgId: result.providerMessageId,
          sentAt: new Date(),
        },
      });
      // In production, DELIVERED status is set by the provider's delivery
      // webhook, not simulated here.
    } else {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "FAILED", error: result.error },
      });
    }

    // Mark campaign complete if this was the last outstanding message.
    const remaining = await prisma.message.count({
      where: { campaignId: message.campaignId, status: { in: ["PENDING", "QUEUED"] } },
    });
    if (remaining === 0) {
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
  },
  {
    connection,
    limiter: {
      max: BATCH_SIZE,
      duration: Number(process.env.SEND_BATCH_INTERVAL_MS || 1000),
    },
  }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log("Campaign worker started, listening for queued messages...");
