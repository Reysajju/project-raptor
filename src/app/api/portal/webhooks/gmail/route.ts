import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Provider-specific webhook endpoints — these are what the real providers
 *  would call. For the demo, they all just forward to the generic /webhooks
 *  handler after a signature check stub. */
async function handle(provider: string, req: Request) {
  const raw = await req.json().catch(() => ({}));
  const eventId =
    raw.id ?? raw.messageId ?? raw.uuid ?? `${provider}-${Date.now()}`;
  const eventType = raw.type ?? raw.eventType ?? raw.event ?? "message.received";

  // Store raw + normalize via the shared path (no provider secrets in demo)
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

  // RingCentral validation-token handshake
  if (provider === "ringcentral" && req.headers.get("validation-token")) {
    return NextResponse.json(
      { ok: true },
      { headers: { "validation-token": req.headers.get("validation-token")! } }
    );
  }

  // Reuse normalization by posting to /api/portal/webhooks
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
  return handle("gmail", req);
}
