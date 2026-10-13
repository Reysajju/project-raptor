import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/dashboard/sla
 * Computes SLA (Service Level Agreement) status for all active clients.
 * SLA rule: inbound communications should be responded to within 4 hours
 * (business-hours-aware is a stretch goal — we use wall-clock for simplicity).
 *
 * For each client with open inbound comms, computes:
 *   - oldest open inbound age (hours)
 *   - whether it's breached (>4h = at risk, >8h = breached)
 *   - avg response time over last 30 days (for healthy clients)
 *
 * Returns { breaches: [...], atRisk: [...], summary: { breachCount, atRiskCount, avgResponseHours } }
 */
export async function GET() {
  const now = new Date();
  const SLA_AT_RISK_HOURS = 4;
  const SLA_BREACH_HOURS = 8;
  const hourMs = 60 * 60 * 1000;

  // All open inbound comms with their client
  const openInbound = await db.communication.findMany({
    where: {
      status: "open",
      direction: "inbound",
      clientId: { not: null },
    },
    orderBy: { occurredAt: "asc" },
    include: {
      client: {
        select: { id: true, name: true, company: true, accentColor: true, ownerId: true, owner: { select: { fullName: true } } },
      },
    },
  });

  // Group by client — take the oldest open inbound per client
  const oldestPerClient = new Map<string, typeof openInbound[number]>();
  for (const c of openInbound) {
    if (c.clientId && !oldestPerClient.has(c.clientId)) {
      oldestPerClient.set(c.clientId, c);
    }
  }

  const breaches: Array<{ clientId: string; clientName: string; company: string | null; accentColor: string; ownerName: string | null; ageHours: number; channel: string; subject: string }> = [];
  const atRisk: Array<{ clientId: string; clientName: string; company: string | null; accentColor: string; ownerName: string | null; ageHours: number; channel: string; subject: string }> = [];

  for (const [, comm] of oldestPerClient) {
    if (!comm.client) continue;
    const ageHours = (now.getTime() - comm.occurredAt.getTime()) / hourMs;
    const entry = {
      clientId: comm.client.id,
      clientName: comm.client.name,
      company: comm.client.company,
      accentColor: comm.client.accentColor,
      ownerName: comm.client.owner?.fullName ?? null,
      ageHours: Math.round(ageHours * 10) / 10,
      channel: comm.channel,
      subject: comm.subject || comm.bodyText.slice(0, 60),
    };
    if (ageHours >= SLA_BREACH_HOURS) {
      breaches.push(entry);
    } else if (ageHours >= SLA_AT_RISK_HOURS) {
      atRisk.push(entry);
    }
  }

  // Sort: breaches first (oldest first), then at-risk
  breaches.sort((a, b) => b.ageHours - a.ageHours);
  atRisk.sort((a, b) => b.ageHours - a.ageHours);

  return NextResponse.json({
    breaches,
    atRisk,
    summary: {
      breachCount: breaches.length,
      atRiskCount: atRisk.length,
      slaTargetHours: SLA_AT_RISK_HOURS,
      slaBreachHours: SLA_BREACH_HOURS,
    },
  });
}
