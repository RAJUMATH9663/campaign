import { SendResult, SMSProvider } from "./SMSProvider";

/**
 * SMS provider backed by Twilio's official REST API.
 * https://www.twilio.com/docs/sms/send-messages
 *
 * Requires env vars:
 *   SMS_PROVIDER_API_KEY    -> Twilio Account SID
 *   SMS_PROVIDER_API_SECRET -> Twilio Auth Token
 *   SMS_SENDER_ID           -> Twilio "From" number, e.g. +1XXXXXXXXXX
 */
export class TwilioSMSProvider implements SMSProvider {
  name = "twilio";
  private accountSid: string;
  private authToken: string;
  private from: string;

  constructor() {
    this.accountSid = process.env.SMS_PROVIDER_API_KEY || "";
    this.authToken = process.env.SMS_PROVIDER_API_SECRET || "";
    this.from = process.env.SMS_SENDER_ID || "";
  }

  async sendMessage(to: string, message: string): Promise<SendResult> {
    if (!this.accountSid || !this.authToken || !this.from) {
      return { success: false, error: "Twilio credentials not configured on server" };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: to, From: this.from, Body: message });
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
        return { success: false, error: data?.message || `Twilio error (${resp.status})` };
      }
      return { success: true, providerMessageId: data.sid };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error calling Twilio" };
    }
  }
}
