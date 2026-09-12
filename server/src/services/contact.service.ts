import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "../utils/prisma";
import { normalizeAndValidatePhone } from "../utils/phone";

export interface ImportRow {
  name: string;
  phone: string;
  email?: string;
  whatsappOptIn?: boolean;
  smsOptIn?: boolean;
  tags?: string[];
}

export interface ImportRowResult extends ImportRow {
  normalizedPhone: string | null;
  isValid: boolean;
  isDuplicateInFile: boolean;
  errors: string[];
}

export interface ImportSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  imported: number;
  rows: ImportRowResult[];
}

function truthy(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return ["yes", "y", "true", "1"].includes(s);
}

function parseRawRows(buffer: Buffer, filename: string): Record<string, any>[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  if (isCsv) {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return result.data;
  }
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
}

function findColumn(row: Record<string, any>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (match) return row[match];
  }
  return undefined;
}

export function parseAndValidateContacts(
  buffer: Buffer,
  filename: string
): ImportRowResult[] {
  const rawRows = parseRawRows(buffer, filename);
  const seenPhones = new Set<string>();
  const results: ImportRowResult[] = [];

  for (const raw of rawRows) {
    const name = String(findColumn(raw, ["name"]) ?? "").trim();
    const phoneRaw = String(findColumn(raw, ["phone", "phone number", "mobile"]) ?? "").trim();
    const email = String(findColumn(raw, ["email"]) ?? "").trim() || undefined;
    const whatsappOptIn = truthy(findColumn(raw, ["whatsapp opt-in", "whatsapp optin", "whatsapp"]));
    const smsOptIn = truthy(findColumn(raw, ["sms opt-in", "sms optin", "sms"]));
    const tagsRaw = String(findColumn(raw, ["tags"]) ?? "").trim();
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    const errors: string[] = [];
    if (!name) errors.push("Missing name");
    if (!phoneRaw) errors.push("Missing phone number");

    const validation = phoneRaw ? normalizeAndValidatePhone(phoneRaw) : { isValid: false, normalized: null };
    if (phoneRaw && !validation.isValid) {
      errors.push(validation.reason || "Invalid phone number");
    }

    const normalizedPhone = validation.normalized;
    let isDuplicateInFile = false;
    if (normalizedPhone) {
      if (seenPhones.has(normalizedPhone)) {
        isDuplicateInFile = true;
        errors.push("Duplicate phone number in file");
      }
      seenPhones.add(normalizedPhone);
    }

    results.push({
      name,
      phone: phoneRaw,
      email,
      whatsappOptIn,
      smsOptIn,
      tags,
      normalizedPhone,
      isValid: errors.length === 0,
      isDuplicateInFile,
      errors,
    });
  }

  return results;
}

export async function saveValidContacts(userId: string, rows: ImportRowResult[]) {
  let imported = 0;
  for (const row of rows) {
    if (!row.isValid || !row.normalizedPhone) continue;

    const existing = await prisma.contact.findFirst({
      where: { userId, phone: row.normalizedPhone },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: row.name || existing.name,
          email: row.email ?? existing.email,
          whatsappOptIn: row.whatsappOptIn ?? existing.whatsappOptIn,
          smsOptIn: row.smsOptIn ?? existing.smsOptIn,
          tags: row.tags && row.tags.length ? row.tags : existing.tags,
        },
      });
    } else {
      await prisma.contact.create({
        data: {
          userId,
          name: row.name,
          phone: row.normalizedPhone,
          rawPhone: row.phone,
          email: row.email,
          whatsappOptIn: !!row.whatsappOptIn,
          smsOptIn: !!row.smsOptIn,
          tags: row.tags || [],
          isValid: true,
        },
      });
      imported++;
    }
  }
  return imported;
}
