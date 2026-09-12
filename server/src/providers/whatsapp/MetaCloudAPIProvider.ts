import { SendResult } from "../sms/SMSProvider";
import { WhatsAppProvider } from "./WhatsAppProvider";

/**
 * WhatsApp provider backed by Meta's official WhatsApp Business Cloud API.
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Requires env vars:
 *   WHATSAPP_PROVIDER_API_KEY  -> Permanent/System User access token
 *   WHATSAPP_PHONE_NUMBER_ID   -> Registered WhatsApp phone number ID
 *
 * Note: outside a 24h customer-service window, WhatsApp requires sending
 * a pre-approved message template rather than free-form text. Pass the
 * template name via the `template` argument in that case.
 */
export class MetaCloudAPIProvider implements WhatsAppProvider {
  name = "meta_cloud_api";
  private token: string;
  private phoneNumberId: string;

  constructor() {
    this.token = process.env.WHATSAPP_PROVIDER_API_KEY || "";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  }

  async sendMessage(to: string, message: string, template?: string): Promise<SendResult> {
    if (!this.token || !this.phoneNumberId) {
      return { success: false, error: "WhatsApp Cloud API credentials not configured on server" };
    }

    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const payload = template
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: template, language: { code: "en_US" } },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as any;

      if (!resp.ok) {
        return {
          success: false,
          error: data?.error?.message || `WhatsApp Cloud API error (${resp.status})`,
        };
      }
      return { success: true, providerMessageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error calling WhatsApp Cloud API" };
    }
  }
}
