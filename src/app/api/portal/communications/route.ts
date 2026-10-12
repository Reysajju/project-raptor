import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");
  const unmatched = searchParams.get("unmatched") === "1";
  const limit = Number(searchParams.get("limit") ?? "500");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (channel) where.channel = channel;
  if (status) where.status = status;
  if (assignedTo) {
    where.assignedTo = assignedTo === "null" ? null : assignedTo;
  }
  if (unmatched) {
    where.clientId = null;
    where.status = "open";
  }

  const items = await db.communication.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      client: { select: { id: true, name: true, company: true, accentColor: true } },
      assignee: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      attachments: true,
    },
  });

  return NextResponse.json({ communications: items });
}

export async function POST(req: Request) {
  const body = await req.json();

  // Idempotency: if (provider, providerMessageId) already exists, return existing.
  // findFirst because providerMessageId is nullable and Prisma does not generate
  // a compound unique accessor for nullable fields.
  let existing = null;
  if (body.provider && body.providerMessageId) {
    existing = await db.communication.findFirst({
      where: {
        provider: body.provider,
        providerMessageId: body.providerMessageId,
      },
      select: { id: true },
    });
    if (existing) {
      const full = await db.communication.findUnique({ where: { id: existing.id } });
      return NextResponse.json({ communication: full, duplicate: true });
    }
  }

  const created = await db.communication.create({
    data: {
      clientId: body.clientId ?? null,
      channel: body.channel,
      direction: body.direction ?? "internal",
      provider: body.provider ?? "manual",
      providerMessageId: body.providerMessageId,
      threadKey: body.threadKey,
      subject: body.subject ?? "",
      bodyText: body.bodyText ?? "",
      bodyHtmlSanitized: body.bodyHtmlSanitized ?? body.bodyText ?? "",
      summary: body.summary,
      transcript: body.transcript,
      audioUrl: body.audioUrl,
      durationSec: body.durationSec,
      fromValue: body.fromValue ?? "",
      toValue: body.toValue ?? "",
      status: body.status ?? "open",
      assignedTo: body.assignedTo,
      visibleToClient: body.visibleToClient ?? false,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    },
  });

  // If system event about project status change, also create audit log
  if (body.channel === "system" && body.audit) {
    await db.auditLog.create({
      data: {
        actorId: body.actorId ?? null,
        action: body.audit.action ?? "communication.created",
        entity: "communication",
        entityId: created.id,
        metadataJson: JSON.stringify(body.audit.metadata ?? {}),
      },
    });
  }

  return NextResponse.json({ communication: created });
}
