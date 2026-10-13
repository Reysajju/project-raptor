import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const events = await db.webhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: 50,
  });
  const mapped = events.map((e) => ({
    ...e,
    rawJson: e.rawJson ? JSON.parse(e.rawJson) : {},
  }));
  return NextResponse.json({ events: mapped });
}

/**
 * Mock webhook ingest: stores the raw payload, attempts to normalize into a
 * communications row. Used by the simulator UI so the whole pipeline can be
 * exercised end-to-end without real provider credentials.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const provider = body.provider as string;
  const eventType = body.eventType as string;
  const eventId = body.eventId as string;

  if (!provider || !eventId) {
    return NextResponse.json({ error: "provider + eventId required" }, { status: 400 });
  }

  // Idempotent: store raw webhook event
  const event = await db.webhookEvent.upsert({
    where: { provider_eventId: { provider, eventId } },
    create: {
      provider,
      eventId,
      eventType,
      rawJson: JSON.stringify(body.raw ?? {}),
      status: "received",
    },
    update: {},
  });

  if (event.status === "processed") {
    return NextResponse.json({ ok: true, duplicate: true, event });
  }

  try {
    // Try to normalize into a communications row
    const raw = body.raw ?? {};
    const fromValue = raw.from ?? raw.fromNumber ?? "";
    const toValue = raw.to ?? raw.toNumber ?? "";
    const providerMessageId = raw.id ?? raw.messageId ?? eventId;
    const channel = inferChannel(provider, eventType);
    const bodyText = raw.body ?? raw.text ?? raw.transcript ?? "";
    const subject = raw.subject ?? (channel === "call" ? `Call — ${eventType}` : eventType);
    const occurredAt = raw.occurredAt ? new Date(raw.occurredAt) : new Date();

    // Match to a client by email or phone
    const normalizedEmail = fromValue.includes("@") ? fromValue.toLowerCase() : null;
    const normalizedPhone = !normalizedEmail ? String(fromValue).replace(/[^+\d]/g, "") : null;

    let clientId: string | null = null;
    if (normalizedEmail) {
      const contact = await db.clientContact.findUnique({
        where: { type_valueNormalized: { type: "email", valueNormalized: normalizedEmail } },
        select: { clientId: true },
      });
      clientId = contact?.clientId ?? null;
    } else if (normalizedPhone) {
      const contact = await db.clientContact.findFirst({
        where: { type: "phone", valueNormalized: normalizedPhone },
        select: { clientId: true },
      });
      clientId = contact?.clientId ?? null;
    }

    // Idempotent comms insert (findFirst because providerMessageId is nullable,
    // so Prisma does not generate a compound unique accessor)
    const existing = await db.communication.findFirst({
      where: { provider, providerMessageId },
      select: { id: true },
    });
    if (!existing) {
      await db.communication.create({
        data: {
          clientId,
          channel,
          direction: "inbound",
          provider,
          providerMessageId,
          threadKey: raw.threadKey ?? providerMessageId,
          subject,
          bodyText,
          bodyHtmlSanitized: raw.htmlSanitized ?? bodyText,
          summary: raw.summary,
          transcript: raw.transcript,
          audioUrl: raw.audioUrl,
          durationSec: raw.durationSec,
          fromValue,
          toValue,
          status: "open",
          occurredAt,
        },
      });
    }

    await db.webhookEvent.update({
      where: { id: event.id },
      data: { status: "processed", attempts: { increment: 1 } },
    });

    // Mark integration as recently synced
    await db.integrationCredential.updateMany({
      where: { provider },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ ok: true, normalized: true, matched: !!clientId, event });
  } catch (err) {
    await db.webhookEvent.update({
      where: { id: event.id },
      data: {
        status: "failed",
        attempts: { increment: 1 },
        error: (err as Error).message,
      },
    });
    return NextResponse.json({ ok: false, event }, { status: 500 });
  }
}

function inferChannel(provider: string, eventType: string): "email" | "sms" | "call" {
  if (provider === "gmail") return "email";
  if (provider === "ringcentral" || eventType.startsWith("call")) return "call";
  return "sms";
}
