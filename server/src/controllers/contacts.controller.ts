import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { parseAndValidateContacts, saveValidContacts } from "../services/contact.service";
import { normalizeAndValidatePhone } from "../utils/phone";

export async function listContacts(req: AuthedRequest, res: Response) {
  const { search = "", tag, page = "1", pageSize = "25" } = req.query as Record<string, string>;
  const userId = req.userId!;
  const take = Math.min(Number(pageSize) || 25, 200);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where: any = { userId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tag) where.tags = { has: tag };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
    prisma.contact.count({ where }),
  ]);

  res.json({ contacts, total, page: Number(page), pageSize: take });
}

export async function createContact(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { name, phone, email, whatsappOptIn, smsOptIn, tags } = req.body;

  const validation = normalizeAndValidatePhone(phone || "");
  if (!validation.isValid) throw new AppError(validation.reason || "Invalid phone number");

  const contact = await prisma.contact.create({
    data: {
      userId,
      name,
      phone: validation.normalized!,
      rawPhone: phone,
      email,
      whatsappOptIn: !!whatsappOptIn,
      smsOptIn: !!smsOptIn,
      tags: tags || [],
    },
  });
  res.status(201).json(contact);
}

export async function updateContact(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const existing = await prisma.contact.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Contact not found", 404);

  const { name, phone, email, whatsappOptIn, smsOptIn, tags } = req.body;
  let normalizedPhone = existing.phone;
  if (phone && phone !== existing.rawPhone) {
    const validation = normalizeAndValidatePhone(phone);
    if (!validation.isValid) throw new AppError(validation.reason || "Invalid phone number");
    normalizedPhone = validation.normalized!;
  }

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      phone: normalizedPhone,
      rawPhone: phone ?? existing.rawPhone,
      email: email ?? existing.email,
      whatsappOptIn: whatsappOptIn ?? existing.whatsappOptIn,
      smsOptIn: smsOptIn ?? existing.smsOptIn,
      tags: tags ?? existing.tags,
    },
  });
  res.json(updated);
}

export async function deleteContact(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const existing = await prisma.contact.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Contact not found", 404);
  await prisma.contact.delete({ where: { id } });
  res.status(204).send();
}

export async function deleteAllContacts(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const contacts = await prisma.contact.findMany({
    where: { userId },
    select: { id: true },
  });
  const contactIds = contacts.map((c: { id: string }) => c.id);

  if (contactIds.length > 0) {
    await prisma.$transaction([
      prisma.contactGroupMember.deleteMany({ where: { contactId: { in: contactIds } } }),
      prisma.campaignRecipient.deleteMany({ where: { contactId: { in: contactIds } } }),
      prisma.consent.deleteMany({ where: { contactId: { in: contactIds } } }),
      prisma.message.deleteMany({ where: { contactId: { in: contactIds } } }),
      prisma.contact.deleteMany({ where: { userId } }),
    ]);
  }

  res.json({ success: true, count: contactIds.length });
}

/** Step 1 of import: parse + validate only, does not save to DB. Lets the
 *  frontend show a preview of valid/invalid/duplicate counts before commit. */
export async function previewImport(req: AuthedRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded");
  const rows = parseAndValidateContacts(req.file.buffer, req.file.originalname);

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.length - validCount;
  const duplicateCount = rows.filter((r) => r.isDuplicateInFile).length;

  res.json({
    totalRows: rows.length,
    validCount,
    invalidCount,
    duplicateCount,
    rows,
  });
}

/** Step 2 of import: commit previously-previewed rows (client re-sends the
 *  validated row list to avoid re-parsing and to allow user edits first). */
export async function commitImport(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const { rows } = req.body as { rows: any[] };
  if (!Array.isArray(rows)) throw new AppError("rows must be an array");

  const imported = await saveValidContacts(userId, rows);

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CONTACTS_IMPORTED",
      entity: "Contact",
      metadata: { imported, totalRows: rows.length },
    },
  });

  res.json({ imported });
}
