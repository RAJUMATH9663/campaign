import { SendResult } from "../sms/SMSProvider";

export interface WhatsAppProvider {
  name: string;
  /**
   * @param to        E.164 phone number
   * @param message   Free-form text (only valid within a 24h customer service window
   *                   per WhatsApp policy)
   * @param template  Optional pre-approved template name, required for
   *                   business-initiated conversations outside the 24h window.
   */
  sendMessage(to: string, message: string, template?: string): Promise<SendResult>;
}
