import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/clients/[id]/health
 * Computes a 0-100 health score for a client based on:
 *   - Communication recency (last contact within 7 days = good)
 *   - Open items (fewer is better)
 *   - Pending approvals (fewer is better)
 *   - Project status (active projects = good; stalled = bad)
 *   - Overdue tasks (fewer is better)
 *   - Status (active > prospect > paused > churned)
 *
 * Also returns a sentiment label (healthy / needs attention / at risk / critical)
 * and the contributing factors for the UI to display.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const [comms, openCount, pendingApprovals, projects, overdueTasks] = await Promise.all([
    db.communication.findFirst({
      where: { clientId: id },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true, channel: true },
    }),
    db.communication.count({ where: { clientId: id, status: "open" } }),
    db.approval.count({ where: { clientId: id, status: "pending" } }),
    db.project.count({ where: { clientId: id, status: { in: ["active", "planning", "review"] } } }),
    db.task.count({
      where: {
        status: { not: "done" },
        dueDate: { lt: now },
        project: { clientId: id },
      },
    }),
  ]);

  const factors: { label: string; impact: number; detail: string }[] = [];

  // 1. Communication recency (up to 30 points)
  let recencyScore = 0;
  if (comms) {
    const daysSince = (now.getTime() - comms.occurredAt.getTime()) / dayMs;
    if (daysSince <= 1) recencyScore = 30;
    else if (daysSince <= 3) recencyScore = 25;
    else if (daysSince <= 7) recencyScore = 20;
    else if (daysSince <= 14) recencyScore = 12;
    else if (daysSince <= 30) recencyScore = 6;
    else recencyScore = 0;
    factors.push({
      label: "Communication recency",
      impact: recencyScore,
      detail: daysSince <= 1 ? "Contacted today" : `${Math.round(daysSince)} days since last contact`,
    });
  } else {
    factors.push({ label: "Communication recency", impact: 0, detail: "No contact yet" });
  }

  // 2. Open items (up to 20 points — fewer is better)
  const openScore = Math.max(0, 20 - openCount * 5);
  factors.push({
    label: "Open items",
    impact: openScore,
    detail: openCount === 0 ? "No open items" : `${openCount} open item${openCount === 1 ? "" : "s"}`,
  });

  // 3. Pending approvals (up to 15 points — fewer is better)
  const approvalScore = Math.max(0, 15 - pendingApprovals * 5);
  factors.push({
    label: "Pending approvals",
    impact: approvalScore,
    detail: pendingApprovals === 0 ? "No pending approvals" : `${pendingApprovals} pending`,
  });

  // 4. Active projects (up to 20 points)
  const projectScore = Math.min(20, projects * 10);
  factors.push({
    label: "Active projects",
    impact: projectScore,
    detail: projects === 0 ? "No active projects" : `${projects} active project${projects === 1 ? "" : "s"}`,
  });

  // 5. Overdue tasks (up to 15 points — fewer is better)
  const overdueScore = Math.max(0, 15 - overdueTasks * 5);
  factors.push({
    label: "Overdue tasks",
    impact: overdueScore,
    detail: overdueTasks === 0 ? "No overdue tasks" : `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}`,
  });

  const total = recencyScore + openScore + approvalScore + projectScore + overdueScore;

  const sentiment =
    total >= 75 ? "healthy" :
    total >= 50 ? "needs attention" :
    total >= 25 ? "at risk" :
    "critical";

  const sentimentTone =
    total >= 75 ? "emerald" :
    total >= 50 ? "amber" :
    total >= 25 ? "rose" :
    "rose";

  return NextResponse.json({
    score: total,
    sentiment,
    sentimentTone,
    factors,
    lastContact: comms?.occurredAt ?? null,
    lastContactChannel: comms?.channel ?? null,
    openCount,
    pendingApprovals,
    activeProjects: projects,
    overdueTasks,
  });
}
