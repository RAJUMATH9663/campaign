import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { extractVariables } from "../utils/template";

export async function list(req: AuthedRequest, res: Response) {
  const templates = await prisma.messageTemplate.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(templates);
}

export async function create(req: AuthedRequest, res: Response) {
  const { name, channel, content } = req.body;
  if (!name || !channel || !content) throw new AppError("name, channel and content are required");

  const template = await prisma.messageTemplate.create({
    data: {
      userId: req.userId!,
      name,
      channel,
      content,
      variables: extractVariables(content),
    },
  });
  res.status(201).json(template);
}

export async function update(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.messageTemplate.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) throw new AppError("Template not found", 404);

  const { name, channel, content, status } = req.body;
  const updated = await prisma.messageTemplate.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      channel: channel ?? existing.channel,
      content: content ?? existing.content,
      variables: content ? extractVariables(content) : existing.variables,
      status: status ?? existing.status,
    },
  });
  res.json(updated);
}

export async function remove(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.messageTemplate.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) throw new AppError("Template not found", 404);
  await prisma.messageTemplate.delete({ where: { id } });
  res.status(204).send();
}
