import { SendResult } from "../sms/SMSProvider";
import { WhatsAppProvider } from "./WhatsAppProvider";

/**
 * Mock provider for local development. Does not contact WhatsApp at all.
 * Useful for testing the campaign pipeline, queue, and UI safely.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "mock";

  async sendMessage(to: string, message: string, template?: string): Promise<SendResult> {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 300));

    if (!to || (!message && !template)) {
      return { success: false, error: "Missing recipient or message/template" };
    }

    const success = Math.random() > 0.05;
    if (!success) {
      return { success: false, error: "Simulated provider failure" };
    }

    return {
      success: true,
      providerMessageId: `mock-wa-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    };
  }
}
