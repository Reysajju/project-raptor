import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * AI-suggested next actions for the dashboard.
 * Analyzes: stale open threads, pending approvals, overdue tasks, expiring
 * integrations. Returns 3-5 concrete, prioritized suggestions with links.
 */
export async function GET() {
  try {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [staleOpen, pendingApprovals, overdueTasks, expiringIntegrations] = await Promise.all([
      db.communication.findMany({
        where: { status: "open", clientId: { not: null }, occurredAt: { lt: staleCutoff } },
        orderBy: { occurredAt: "asc" },
        take: 5,
        select: {
          id: true,
          clientId: true,
          channel: true,
          subject: true,
          bodyText: true,
          occurredAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
      db.approval.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        take: 5,
        include: {
          client: { select: { id: true, name: true } },
        },
      }),
      db.task.findMany({
        where: { status: { not: "done" }, dueDate: { lt: now } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: {
          project: { select: { id: true, title: true, clientId: true } },
        },
      }),
      db.integrationCredential.findMany({
        where: {
          status: "connected",
          watchExpiresAt: { lt: new Date(now.getTime() + 3 * dayMs) },
        },
      }),
    ]);

    const actions: Array<{
      id: string;
      priority: "urgent" | "high" | "medium";
      title: string;
      detail: string;
      cta: string;
      target: { view: string; clientId?: string };
      icon: string;
    }> = [];

    // 1. Stale open threads (>24h no reply)
    for (const c of staleOpen) {
      const hoursAgo = Math.round((now.getTime() - c.occurredAt.getTime()) / (60 * 60 * 1000));
      actions.push({
        id: `stale-${c.id}`,
        priority: hoursAgo > 48 ? "urgent" : "high",
        title: `Reply to ${c.client?.name ?? "client"}`,
        detail: `Open ${c.channel} thread waiting ${hoursAgo}h${c.subject ? ` — "${c.subject}"` : ""}`,
        cta: "Open thread",
        target: { view: "client", clientId: c.clientId ?? undefined },
        icon: "inbox",
      });
    }

    // 2. Pending approvals
    for (const a of pendingApprovals) {
      actions.push({
        id: `approval-${a.id}`,
        priority: "medium",
        title: `Approval pending: ${a.title}`,
        detail: `${a.client?.name ?? "Client"} is waiting for a decision`,
        cta: "Review",
        target: { view: "approvals" },
        icon: "check",
      });
    }

    // 3. Overdue tasks
    for (const t of overdueTasks) {
      const daysLate = Math.max(1, Math.round((now.getTime() - (t.dueDate?.getTime() ?? now.getTime())) / dayMs));
      actions.push({
        id: `task-${t.id}`,
        priority: daysLate > 2 ? "high" : "medium",
        title: `Task overdue: ${t.title}`,
        detail: `${daysLate} day${daysLate === 1 ? "" : "s"} late · ${t.project?.title ?? "Unassigned"}`,
        cta: "View project",
        target: { view: "projects" },
        icon: "alert",
      });
    }

    // 4. Expiring integrations
    for (const i of expiringIntegrations) {
      const daysLeft = Math.max(0, Math.round(((i.watchExpiresAt?.getTime() ?? 0) - now.getTime()) / dayMs));
      actions.push({
        id: `integ-${i.id}`,
        priority: daysLeft <= 1 ? "urgent" : "high",
        title: `Renew ${i.provider} watch`,
        detail: daysLeft <= 0
          ? `${i.provider} webhook subscription has expired`
          : `${i.provider} subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        cta: "Go to settings",
        target: { view: "settings" },
        icon: "plug",
      });
    }

    // Sort by priority then recency
    const order = { urgent: 0, high: 1, medium: 2 };
    actions.sort((a, b) => order[a.priority] - order[b.priority]);

    return NextResponse.json({ actions: actions.slice(0, 6) });
  } catch (err) {
    console.error("[ai/next-actions] error", err);
    return NextResponse.json(
      { error: "Failed to compute next actions", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
