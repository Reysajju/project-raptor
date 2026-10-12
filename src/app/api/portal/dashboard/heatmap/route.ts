import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/dashboard/heatmap
 * Returns per-day communication counts for the last 90 days, grouped by
 * channel. Used by the dashboard activity heatmap widget.
 */
export async function GET() {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = new Date(now.getTime() - 89 * dayMs);

  const comms = await db.communication.findMany({
    where: {
      occurredAt: { gte: ninetyDaysAgo },
      clientId: { not: null },
    },
    select: { occurredAt: true, channel: true },
  });

  // Build a map of dateKey -> { count, channels }
  const dayMap = new Map<string, { count: number; channels: Record<string, number> }>();
  for (let i = 0; i < 90; i++) {
    const d = new Date(now.getTime() - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { count: 0, channels: {} });
  }

  for (const c of comms) {
    const key = c.occurredAt.toISOString().slice(0, 10);
    const day = dayMap.get(key);
    if (day) {
      day.count++;
      day.channels[c.channel] = (day.channels[c.channel] ?? 0) + 1;
    }
  }

  // Return as array of { date, count, channels } oldest-first (for left-to-right rendering)
  const days = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .reverse();

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const totalComms = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return NextResponse.json({
    days,
    maxCount,
    totalComms,
    activeDays,
    spanDays: 90,
  });
}
