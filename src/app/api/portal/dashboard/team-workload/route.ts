import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/dashboard/team-workload
 * Returns per-team-member workload: assigned clients, open comms, active
 * tasks, pending approvals, overdue tasks. Used by the dashboard widget.
 */
export async function GET() {
  const team = await db.profile.findMany({
    where: { role: { in: ["owner", "admin"] } },
    orderBy: { role: "asc" },
    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
  });

  const now = new Date();

  const workload = await Promise.all(
    team.map(async (m) => {
      const [ownedClients, openComms, activeTasks, overdueTasks, pendingApprovals] = await Promise.all([
        db.client.count({ where: { ownerId: m.id, deletedAt: null, status: { in: ["active", "prospect"] } } }),
        db.communication.count({ where: { assignedTo: m.id, status: "open" } }),
        db.task.count({
          where: {
            assigneeId: m.id,
            status: { in: ["todo", "in_progress", "review"] },
          },
        }),
        db.task.count({
          where: {
            assigneeId: m.id,
            status: { not: "done" },
            dueDate: { lt: now },
          },
        }),
        db.approval.count({
          where: { status: "pending" },
        }),
      ]);

      return {
        ...m,
        ownedClients,
        openComms,
        activeTasks,
        overdueTasks,
        // pendingApprovals is global — only count it for the owner
        pendingApprovals: m.role === "owner" ? pendingApprovals : 0,
      };
    })
  );

  // Sort by total workload (open comms + active tasks + overdue)
  const sorted = workload.sort((a, b) => {
    const aTotal = a.openComms + a.activeTasks + a.overdueTasks;
    const bTotal = b.openComms + b.activeTasks + b.overdueTasks;
    return bTotal - aTotal;
  });

  return NextResponse.json({ team: sorted });
}
