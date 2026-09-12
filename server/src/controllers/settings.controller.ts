import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { prisma } from "../utils/prisma";

/**
 * Only non-secret configuration is stored in the database (e.g. which
 * provider is selected, sender ID/display name). Actual API keys/secrets
 * live in server-side environment variables only, per .env.example.
 */
export async function getSettings(req: AuthedRequest, res: Response) {
  const providers = await prisma.provider.findMany({ where: { userId: req.userId! } });
  res.json({
    providers,
    // Surface which env-based secrets are configured, WITHOUT returning their values.
    secretsConfigured: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      smsProvider: !!process.env.SMS_PROVIDER_API_KEY,
      whatsappProvider: !!process.env.WHATSAPP_PROVIDER_API_KEY,
    },
    activeAiProvider: process.env.AI_PROVIDER || "anthropic",
    activeSmsProvider: process.env.SMS_PROVIDER || "mock",
    activeWhatsappProvider: process.env.WHATSAPP_PROVIDER || "mock",
  });
}

export async function upsertProviderConfig(req: AuthedRequest, res: Response) {
  const { type, name, config } = req.body;
  const provider = await prisma.provider.create({
    data: { userId: req.userId!, type, name, config },
  });
  res.status(201).json(provider);
}
