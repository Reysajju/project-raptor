import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/dashboard/kpi-trends
 * Returns 7-day trend data for each dashboard KPI so the cards can show
 * a mini sparkline. Each KPI gets an array of {date, value} for the last
 * 7 days.
 */
export async function GET() {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(now.getTime() - i * dayMs));
  }

  const trends: Record<string, { date: string; value: number }[]> = {
    totalClients: [],
    openComms: [],
    activeProjects: [],
    pendingApprovals: [],
  };

  for (const day of days) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const dateStr = dayStart.toISOString().slice(0, 10);

    const [clientsCount, openCommsCount, activeProjectsCount, pendingApprovalsCount] = await Promise.all([
      db.client.count({
        where: { deletedAt: null, createdAt: { lte: dayEnd } },
      }),
      db.communication.count({
        where: {
          status: "open",
          clientId: { not: null },
          occurredAt: { lte: dayEnd },
        },
      }),
      db.project.count({
        where: {
          status: { in: ["active", "planning"] },
          createdAt: { lte: dayEnd },
        },
      }),
      db.approval.count({
        where: {
          status: "pending",
          createdAt: { lte: dayEnd },
        },
      }),
    ]);

    trends.totalClients.push({ date: dateStr, value: clientsCount });
    trends.openComms.push({ date: dateStr, value: openCommsCount });
    trends.activeProjects.push({ date: dateStr, value: activeProjectsCount });
    trends.pendingApprovals.push({ date: dateStr, value: pendingApprovalsCount });
  }

  return NextResponse.json({ trends, days: days.length });
}
