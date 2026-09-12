import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { prisma } from "../utils/prisma";
import * as XLSX from "xlsx";

export async function listMessages(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { status, channel, campaignId, page = "1", pageSize = "25" } = req.query as Record<string, string>;
  const take = Math.min(Number(pageSize) || 25, 200);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where: any = { campaign: { userId } };
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (campaignId) where.campaignId = campaignId;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: { contact: true, campaign: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.message.count({ where }),
  ]);

  res.json({ messages, total, page: Number(page), pageSize: take });
}

export async function exportMessages(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { format = "csv" } = req.query as Record<string, string>;

  const messages = await prisma.message.findMany({
    where: { campaign: { userId } },
    include: { contact: true, campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const rows = messages.map((m: (typeof messages)[number]) => ({
    Contact: m.contact.name,
    Phone: m.contact.phone,
    Channel: m.channel,
    Campaign: m.campaign.name,
    Status: m.status,
    SentAt: m.sentAt?.toISOString() || "",
    DeliveredAt: m.deliveredAt?.toISOString() || "",
    Error: m.error || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Delivery Report");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=delivery-report.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  res.setHeader("Content-Disposition", "attachment; filename=delivery-report.csv");
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
}

export async function dashboardStats(req: AuthedRequest, res: Response) {
  const userId = req.userId!;

  const [totalContacts, validContacts, campaignCount, messageCounts] = await Promise.all([
    prisma.contact.count({ where: { userId } }),
    prisma.contact.count({ where: { userId, isValid: true } }),
    prisma.campaign.count({ where: { userId } }),
    prisma.message.groupBy({
      by: ["status"],
      where: { campaign: { userId } },
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of messageCounts) counts[row.status] = row._count;

  const sentOverTime = await prisma.$queryRawUnsafe(
    `SELECT to_char(date_trunc('day', m."createdAt"), 'YYYY-MM-DD') as day, count(*)::bigint as count
     FROM "Message" m
     JOIN "Campaign" c ON c.id = m."campaignId"
     WHERE c."userId" = $1
     GROUP BY 1 ORDER BY 1 ASC LIMIT 30`,
    userId
  ) as { day: string; count: bigint }[];

  const channelSplit = await prisma.message.groupBy({
    by: ["channel"],
    where: { campaign: { userId } },
    _count: true,
  });

  res.json({
    totalContacts,
    validContacts,
    campaignCount,
    messagesSent: (counts.SENT || 0) + (counts.DELIVERED || 0) + (counts.FAILED || 0),
    delivered: counts.DELIVERED || 0,
    failed: counts.FAILED || 0,
    pending: (counts.PENDING || 0) + (counts.QUEUED || 0),
    sentOverTime: sentOverTime.map((r: { day: string; count: bigint }) => ({ day: r.day, count: Number(r.count) })),
    channelSplit: channelSplit.map((c: (typeof channelSplit)[number]) => ({ channel: c.channel, count: c._count })),
  });
}
