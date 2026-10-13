import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/settings/email-accounts
 * Returns all connected email accounts.
 */
export async function GET() {
  const accounts = await db.emailAccount.findMany({
    orderBy: { connectedAt: "desc" },
  });
  return NextResponse.json({ accounts });
}

/**
 * POST /api/portal/settings/email-accounts
 * Body: { email, type, displayName?, config? }
 * Adds a new email account (Gmail OAuth or custom domain IMAP/SMTP).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { email, type, displayName, config } = body as {
    email: string;
    type: string;
    displayName?: string;
    config?: Record<string, unknown>;
  };

  if (!email || !type) {
    return NextResponse.json({ error: "email and type are required" }, { status: 400 });
  }

  const validTypes = ["gmail", "custom", "outlook"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const created = await db.emailAccount.create({
    data: {
      email,
      type,
      displayName: displayName || null,
      configJson: JSON.stringify(config ?? {}),
    },
  });

  await db.auditLog.create({
    data: {
      action: "email_account.connected",
      entity: "email_account",
      entityId: created.id,
      metadataJson: JSON.stringify({ email, type }),
    },
  });

  return NextResponse.json({ account: created });
}

/**
 * DELETE /api/portal/settings/email-accounts?id=X
 * Removes an email account.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await db.emailAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
