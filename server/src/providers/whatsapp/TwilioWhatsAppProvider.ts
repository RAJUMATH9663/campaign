import "dotenv/config";
import { SendResult } from "../sms/SMSProvider";
import { WhatsAppProvider } from "./WhatsAppProvider";

/**
 * WhatsApp provider backed by Twilio's Programmable Messaging API for WhatsApp.
 * https://www.twilio.com/docs/whatsapp/api
 *
 * Uses:
 *   SMS_PROVIDER_API_KEY / TWILIO_ACCOUNT_SID -> Twilio Account SID
 *   SMS_PROVIDER_API_SECRET / TWILIO_AUTH_TOKEN -> Twilio Auth Token
 *   WHATSAPP_SENDER_ID -> Twilio WhatsApp number (e.g. +14155238886 for Sandbox)
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  name = "twilio";
  private accountSid: string;
  private authToken: string;
  private from: string;

  constructor() {
    this.accountSid = process.env.WHATSAPP_PROVIDER_API_KEY || process.env.SMS_PROVIDER_API_KEY || "";
    this.authToken = process.env.WHATSAPP_PROVIDER_API_SECRET || process.env.SMS_PROVIDER_API_SECRET || "";
    // Default to Twilio WhatsApp Sandbox number if not specified
    const rawFrom = process.env.WHATSAPP_SENDER_ID || process.env.SMS_SENDER_ID || "+14155238886";
    this.from = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;
  }

  async sendMessage(to: string, message: string): Promise<SendResult> {
    if (!this.accountSid || !this.authToken) {
      return { success: false, error: "Twilio WhatsApp credentials not configured on server" };
    }

    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: formattedTo,
      From: this.from,
      Body: message,
    });
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      const data = (await resp.json()) as any;

      if (!resp.ok) {
        return { success: false, error: data?.message || `Twilio WhatsApp error (${resp.status})` };
      }
      return { success: true, providerMessageId: data.sid };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error calling Twilio WhatsApp" };
    }
  }
}
