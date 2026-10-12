import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Bulk import clients from a CSV-shaped JSON payload.
 * POST { rows: Array<{name, company?, status?, tags?, email?, phone?, ownerEmail?}> }
 *   → { imported: number, skipped: number, errors: string[] }
 *
 * Each row becomes a Client (+ a ClientContact if email/phone is provided).
 * Idempotent on the contact value: if a contact with the same normalized
 * email/phone already exists, the row is skipped (not duplicated).
 */
interface ImportRow {
  name?: string;
  company?: string;
  status?: string;
  tags?: string;
  email?: string;
  phone?: string;
  ownerEmail?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = (body.rows ?? []) as ImportRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    // Resolve owner emails to profile ids up front
    const ownerEmails = Array.from(
      new Set(rows.map((r) => r.ownerEmail).filter(Boolean) as string[])
    );
    const owners: Record<string, string> = {};
    if (ownerEmails.length > 0) {
      const profiles = await db.profile.findMany({
        where: { email: { in: ownerEmails } },
        select: { id: true, email: true },
      });
      for (const p of profiles) owners[p.email.toLowerCase()] = p.id;
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name ?? "").trim();
      if (!name) {
        errors.push(`Row ${i + 2}: missing name`);
        skipped++;
        continue;
      }

      const email = (row.email ?? "").trim();
      const phone = (row.phone ?? "").trim();
      const normalizedEmail = email ? email.toLowerCase() : null;
      const normalizedPhone = phone ? phone.replace(/[^+\d]/g, "") : null;

      // Idempotency: skip if a contact with this email/phone already exists
      if (normalizedEmail) {
        const existing = await db.clientContact.findUnique({
          where: { type_valueNormalized: { type: "email", valueNormalized: normalizedEmail } },
          select: { clientId: true },
        });
        if (existing) {
          skipped++;
          errors.push(`Row ${i + 2}: email "${email}" already linked to a client`);
          continue;
        }
      }
      if (normalizedPhone) {
        const existing = await db.clientContact.findFirst({
          where: { type: "phone", valueNormalized: normalizedPhone },
          select: { clientId: true },
        });
        if (existing) {
          skipped++;
          errors.push(`Row ${i + 2}: phone "${phone}" already linked to a client`);
          continue;
        }
      }

      const ownerId = row.ownerEmail ? owners[row.ownerEmail.toLowerCase()] ?? null : null;

      try {
        const client = await db.client.create({
          data: {
            name,
            company: row.company?.trim() || null,
            status: ["active", "prospect", "churned", "paused"].includes(row.status ?? "")
              ? row.status!
              : "prospect",
            tags: row.tags?.trim() || "",
            ownerId,
          },
        });

        if (normalizedEmail) {
          await db.clientContact.create({
            data: {
              clientId: client.id,
              type: "email",
              value: email,
              valueNormalized: normalizedEmail,
              label: "work",
              isPrimary: true,
            },
          });
        }
        if (normalizedPhone) {
          await db.clientContact.create({
            data: {
              clientId: client.id,
              type: "phone",
              value: phone,
              valueNormalized: normalizedPhone,
              label: "mobile",
              isPrimary: !normalizedEmail,
            },
          });
        }

        await db.auditLog.create({
          data: {
            action: "client.imported",
            entity: "client",
            entityId: client.id,
            metadataJson: JSON.stringify({ name, row: i + 2 }),
          },
        });

        imported++;
      } catch (err) {
        skipped++;
        errors.push(`Row ${i + 2}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (err) {
    console.error("[clients/import] error", err);
    return NextResponse.json(
      { error: "Import failed", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
