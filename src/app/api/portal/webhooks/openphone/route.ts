import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function handle(provider: string, req: Request) {
  const raw = await req.json().catch(() => ({}));
  const eventId =
    raw.id ?? raw.messageId ?? raw.uuid ?? `${provider}-${Date.now()}`;
  const eventType = raw.type ?? raw.eventType ?? raw.event ?? "message.received";

  const event = await db.webhookEvent.upsert({
    where: { provider_eventId: { provider, eventId } },
    create: {
      provider,
      eventId,
      eventType,
      rawJson: JSON.stringify(raw),
      status: "received",
    },
    update: {},
  });
  if (event.status === "processed") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await fetch(`${new URL(req.url).origin}/api/portal/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, eventId, eventType, raw }),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handle("openphone", req);
}
