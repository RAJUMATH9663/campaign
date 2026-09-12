import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { generateMessageVariations, AIAction } from "../services/ai.service";

const VALID_ACTIONS: AIAction[] = [
  "generate",
  "improve",
  "shorten",
  "professional",
  "promotional",
  "friendly",
  "translate",
];

export async function generate(req: AuthedRequest, res: Response) {
  const { action, input, count } = req.body as { action: AIAction; input: string; count?: number };

  if (!VALID_ACTIONS.includes(action)) throw new AppError("Invalid AI action");
  if (!input || !input.trim()) throw new AppError("input is required");

  try {
    const variations = await generateMessageVariations(action, input, count ?? 3);
    // Note: this endpoint only ever returns text suggestions. Sending a
    // campaign always requires a separate, explicit user action.
    res.json({ variations });
  } catch (err: any) {
    throw new AppError(err.message || "AI generation failed", 502);
  }
}
