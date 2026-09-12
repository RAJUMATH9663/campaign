import { Channel, Contact } from "@prisma/client";
import { prisma } from "../utils/prisma";

export interface EligibilityResult {
  contact: Contact;
  eligible: boolean;
  reason?: string;
}

/**
 * Determines whether a contact may legally/ethically receive a message on
 * the given channel: must have explicit opt-in for that channel AND must
 * not be on the suppression (opt-out) list.
 */
export async function checkEligibility(
  contacts: Contact[],
  channel: Channel
): Promise<EligibilityResult[]> {
  const suppressed = await prisma.suppressionList.findMany({
    where: { phone: { in: contacts.map((c) => c.phone) } },
  });
  const suppressedSet = new Set(suppressed.map((s: (typeof suppressed)[number]) => s.phone));

  return contacts.map((contact) => {
    if (suppressedSet.has(contact.phone)) {
      return { contact, eligible: false, reason: "Contact has opted out (suppression list)" };
    }
    if (channel === "SMS" && !contact.smsOptIn) {
      return { contact, eligible: false, reason: "No SMS opt-in on record" };
    }
    if (channel === "WHATSAPP" && !contact.whatsappOptIn) {
      return { contact, eligible: false, reason: "No WhatsApp opt-in on record" };
    }
    if (!contact.isValid) {
      return { contact, eligible: false, reason: "Invalid phone number" };
    }
    return { contact, eligible: true };
  });
}

export async function addToSuppressionList(phone: string, reason: string, channel?: Channel) {
  return prisma.suppressionList.upsert({
    where: { phone },
    update: { reason },
    create: { phone, reason, channel },
  });
}

/** Handles inbound STOP/UNSUBSCRIBE keywords from a webhook. */
export async function handleOptOutKeyword(phone: string, rawText: string) {
  const normalized = rawText.trim().toLowerCase();
  const stopKeywords = ["stop", "unsubscribe", "opt out", "optout", "cancel"];
  if (stopKeywords.some((k) => normalized === k || normalized.includes(k))) {
    await addToSuppressionList(phone, "User replied STOP/UNSUBSCRIBE");
    await prisma.contact.updateMany({
      where: { phone },
      data: { smsOptIn: false, whatsappOptIn: false },
    });
    return true;
  }
  return false;
}
