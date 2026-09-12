import { SMSProvider } from "./sms/SMSProvider";
import { MockSMSProvider } from "./sms/MockSMSProvider";
import { TwilioSMSProvider } from "./sms/TwilioSMSProvider";
import { WhatsAppProvider } from "./whatsapp/WhatsAppProvider";
import { MockWhatsAppProvider } from "./whatsapp/MockWhatsAppProvider";
import { MetaCloudAPIProvider } from "./whatsapp/MetaCloudAPIProvider";
import { TwilioWhatsAppProvider } from "./whatsapp/TwilioWhatsAppProvider";

export function getSMSProvider(): SMSProvider {
  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "twilio":
      return new TwilioSMSProvider();
    case "mock":
    default:
      return new MockSMSProvider();
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const provider = (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "twilio":
      return new TwilioWhatsAppProvider();
    case "meta_cloud_api":
      return new MetaCloudAPIProvider();
    case "mock":
    default:
      return new MockWhatsAppProvider();
  }
}
