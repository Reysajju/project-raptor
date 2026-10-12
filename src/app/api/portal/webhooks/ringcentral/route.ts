import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function handle(provider: string, req: Request) {
  // RingCentral sends a Validation-Token header on the handshake
  const validationToken = req.headers.get("validation-token");
  if (provider === "ringcentral" && validationToken) {
    return new NextResponse(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
        "validation-token": validationToken,
      },
    });
  }

  const raw = await req.json().catch(() => ({}));
  const eventId = raw.uuid ?? raw.id ?? `${provider}-${Date.now()}`;
  const eventType = raw.type ?? raw.eventType ?? "call.completed";

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
  return handle("ringcentral", req);
}
