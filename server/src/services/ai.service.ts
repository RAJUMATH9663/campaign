import "dotenv/config";

/**
 * AI service abstraction. Keeps the rest of the app decoupled from any
 * single AI vendor. API keys are read from server-side env vars only and
 * are never sent to the frontend.
 */

export type AIAction =
  | "generate"
  | "improve"
  | "shorten"
  | "professional"
  | "promotional"
  | "friendly"
  | "translate";

interface AICompletionParams {
  prompt: string;
  variations?: number;
}

interface AIProviderClient {
  complete(params: AICompletionParams): Promise<string[]>;
}

class OpenAIClient implements AIProviderClient {
  private apiKey = process.env.OPENAI_API_KEY || "";

  async complete({ prompt, variations = 1 }: AICompletionParams): Promise<string[]> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY not configured on server");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        n: variations,
        temperature: 0.8,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI error: ${err}`);
    }
    const data = (await resp.json()) as any;
    return (data.choices || []).map((c: any) => c.message?.content?.trim() || "");
  }
}

class AnthropicClient implements AIProviderClient {
  private apiKey = process.env.ANTHROPIC_API_KEY || "";

  async complete({ prompt, variations = 1 }: AICompletionParams): Promise<string[]> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY not configured on server");

    const results: string[] = [];
    // Anthropic's Messages API doesn't support n>1 in one call; loop instead.
    for (let i = 0; i < variations; i++) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Anthropic error: ${err}`);
      }
      const data = (await resp.json()) as any;
      const text = (data.content || [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim();
      results.push(text);
    }
    return results;
  }
}

class GeminiClient implements AIProviderClient {
  private apiKey = process.env.GEMINI_API_KEY || "";
  private model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  async complete({ prompt, variations = 1 }: AICompletionParams): Promise<string[]> {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY not configured on server");

    // Asking for JSON array of N variations in a single prompt is much faster,
    // avoids quota limits, and completes in ~1s instead of multiple sequential round trips.
    const jsonPrompt = [
      prompt,
      "",
      `Return EXACTLY ${variations} distinct variation(s).`,
      `Return ONLY a valid JSON array of strings, e.g. ["Variation 1", "Variation 2"]. No markdown code blocks, no explanation.`,
    ].join("\n");

    const modelsToTry = [this.model, "gemini-3.5-flash", "gemini-3.7-flash"];
    let lastError: any = null;

    for (const m of modelsToTry) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: jsonPrompt }] }],
              generationConfig: {
                temperature: 0.85,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (!resp.ok) {
          const err = await resp.text();
          throw new Error(`Gemini (${m}) error: ${err}`);
        }

        const data = (await resp.json()) as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (!text) continue;

        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => String(item).trim()).filter(Boolean);
          }
          if (typeof parsed === "object" && parsed !== null) {
            const values = Object.values(parsed);
            if (values.length > 0 && typeof values[0] === "string") {
              return (values as string[]).map((v) => String(v).trim()).filter(Boolean);
            }
          }
        } catch {
          return [text];
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiClient] Model ${m} attempt failed:`, err.message);
      }
    }

    throw lastError || new Error("Failed to generate content with Gemini");
  }
}

function getClient(): AIProviderClient {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider === "openai") return new OpenAIClient();
  if (provider === "anthropic") return new AnthropicClient();
  return new GeminiClient();
}

const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  generate: "Write a new marketing/notification message based on this brief:",
  improve: "Improve the clarity and effectiveness of this message, keeping the same intent:",
  shorten: "Rewrite this message to be significantly shorter while keeping the key point:",
  professional: "Rewrite this message in a more professional and polished tone:",
  promotional: "Rewrite this message to be more compelling and promotional, without being spammy:",
  friendly: "Rewrite this message so it sounds warm and friendly:",
  translate: "Translate this message as requested (target language should be specified in the input):",
};

export async function generateMessageVariations(
  action: AIAction,
  input: string,
  count = 3
): Promise<string[]> {
  const client = getClient();
  const instruction = ACTION_INSTRUCTIONS[action] || ACTION_INSTRUCTIONS.generate;
  const prompt = [
    instruction,
    "",
    `"""${input}"""`,
    "",
    "Rules:",
    "- Keep it concise and suitable for SMS/WhatsApp (under 300 characters where possible).",
    "- You may use variables like {{name}} for personalization if appropriate.",
    "- Do not include quotation marks around the output.",
    "- Return ONLY the message text, nothing else.",
  ].join("\n");

  const variations = await client.complete({ prompt, variations: count });
  return variations.map((v) => v.replace(/^["']|["']$/g, "").trim()).filter(Boolean);
}
