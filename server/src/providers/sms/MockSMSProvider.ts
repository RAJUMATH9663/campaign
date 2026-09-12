import { SendResult, SMSProvider } from "./SMSProvider";

/**
 * Mock provider for local development and safe testing.
 * Does NOT send any real message. Simulates latency and a
 * configurable success rate so the UI/queue pipeline can be tested
 * end-to-end without a paid provider.
 */
export class MockSMSProvider implements SMSProvider {
  name = "mock";

  async sendMessage(to: string, message: string): Promise<SendResult> {
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));

    if (!to || !message) {
      return { success: false, error: "Missing recipient or message" };
    }

    // Simulate ~95% success rate
    const success = Math.random() > 0.05;
    if (!success) {
      return { success: false, error: "Simulated provider failure" };
    }

    return {
      success: true,
      providerMessageId: `mock-sms-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    };
  }
}
