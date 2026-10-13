import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Trigger a mock webhook event so users can exercise the ingest pipeline. */
export async function POST(req: Request) {
  const body = await req.json();
  const provider = (body.provider ?? "gmail") as string;
  const scenario = (body.scenario ?? "email") as string;

  const scenarios: Record<string, { eventId: string; eventType: string; raw: Record<string, unknown> }> = {
    "gmail-email-northwind": {
      eventId: `sim_${provider}_${Date.now()}`,
      eventType: "message.received",
      raw: {
        id: `sim_gm_${Date.now()}`,
        from: "eleanor@northwind.com",
        to: "support@onboardwithus.com",
        subject: "Quick question on the addendum",
        body: "Hi team — one more thing: can you clarify the termination clause in section 7? Want to make sure legal is comfortable before we sign.",
        threadKey: "northwind-renewal",
        occurredAt: new Date().toISOString(),
      },
    },
    "openphone-sms-northwind": {
      eventId: `sim_${provider}_${Date.now()}`,
      eventType: "message.received",
      raw: {
        id: `sim_op_${Date.now()}`,
        from: "+14155550142",
        to: "+18005550199",
        body: "Heads up — I'll be 10 min late to the call today.",
        occurredAt: new Date().toISOString(),
      },
    },
    "openphone-sms-contoso": {
      eventId: `sim_${provider}_${Date.now()}`,
      eventType: "message.received",
      raw: {
        id: `sim_op_co_${Date.now()}`,
        from: "+12125550199",
        to: "+18005550199",
        body: "Got the matrix, will review this afternoon.",
        occurredAt: new Date().toISOString(),
      },
    },
    "ringcentral-call-northwind": {
      eventId: `sim_${provider}_${Date.now()}`,
      eventType: "call.completed",
      raw: {
        id: `sim_rc_${Date.now()}`,
        from: "+14155550142",
        to: "+18005550199",
        duration: 312,
        summary: "Eleanor called about the support hours tier. Wants to confirm 20 hours is locked in. Will sign tomorrow.",
        transcript: "[00:00] Eleanor: Hi, quick question about the support tier...\n[02:30] Priya: Confirmed, 20 hours is locked.\n[05:12] Call ended.",
        audioUrl: "/mock-storage/calls/sim-northwind.mp3",
        occurredAt: new Date().toISOString(),
      },
    },
    "ringcentral-call-unmatched": {
      eventId: `sim_${provider}_${Date.now()}`,
      eventType: "call.completed",
      raw: {
        id: `sim_rc_unmatched_${Date.now()}`,
        from: "+15145550188",
        to: "+18005550199",
        duration: 90,
        summary: "Unknown caller — left a voicemail asking about enterprise pricing.",
        transcript: "[00:00] Caller: Hi, this is a message for the support team...",
        occurredAt: new Date().toISOString(),
      },
    },
  };

  const key = `${provider}-${scenario}`;
  const picked = scenarios[key] ?? scenarios["gmail-email-northwind"];

  // POST to the generic webhook endpoint
  const res = await fetch(`${new URL(req.url).origin}/api/portal/webhooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      eventId: picked.eventId,
      eventType: picked.eventType,
      raw: picked.raw,
    }),
  });

  const result = await res.json();
  return NextResponse.json({ ok: res.ok, scenario: key, result });
}

export async function GET() {
  return NextResponse.json({
    scenarios: [
      { id: "gmail-email-northwind", provider: "gmail", label: "New email from Eleanor (Northwind)" },
      { id: "openphone-sms-northwind", provider: "openphone", label: "SMS from Eleanor (Northwind)" },
      { id: "openphone-sms-contoso", provider: "openphone", label: "SMS from David (Contoso)" },
      { id: "ringcentral-call-northwind", provider: "ringcentral", label: "Inbound call from Eleanor (Northwind)" },
      { id: "ringcentral-call-unmatched", provider: "ringcentral", label: "Call from unknown number (triage)" },
    ],
  });
}
