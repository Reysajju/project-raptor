import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [
    totalClients,
    activeClients,
    openComms,
    unassignedComms,
    unmatched,
    pendingApprovals,
    activeProjects,
    overdueTasks,
    integrations,
    byChannel,
  ] = await Promise.all([
    db.client.count({ where: { deletedAt: null } }),
    db.client.count({ where: { deletedAt: null, status: "active" } }),
    db.communication.count({ where: { status: "open", clientId: { not: null } } }),
    db.communication.count({ where: { status: "open", assignedTo: null, clientId: { not: null } } }),
    db.communication.count({ where: { status: "open", clientId: null } }),
    db.approval.count({ where: { status: "pending" } }),
    db.project.count({ where: { status: { in: ["active", "planning"] } } }),
    db.task.count({
      where: {
        status: { not: "done" },
        dueDate: { lt: new Date() },
      },
    }),
    db.integrationCredential.findMany({ orderBy: { provider: "asc" } }),
    db.communication.groupBy({
      by: ["channel"],
      where: { clientId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const channelCounts: Record<string, number> = {};
  byChannel.forEach((c) => {
    channelCounts[c.channel] = c._count._all;
  });

  // Recent activity (last 12 events, mix of comms + approvals)
  const recentComms = await db.communication.findMany({
    where: { clientId: { not: null } },
    orderBy: { occurredAt: "desc" },
    take: 12,
    include: { client: { select: { id: true, name: true, company: true } } },
  });

  // At-risk clients: prospect/active with open items older than 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleOpen = await db.communication.findMany({
    where: { status: "open", clientId: { not: null }, occurredAt: { lt: cutoff } },
    select: { clientId: true, occurredAt: true },
    distinct: ["clientId"],
  });

  const clients = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      company: true,
      status: true,
      tags: true,
      accentColor: true,
    },
  });

  return NextResponse.json({
    kpis: {
      totalClients,
      activeClients,
      openComms,
      unassignedComms,
      unmatched,
      pendingApprovals,
      activeProjects,
      overdueTasks,
    },
    integrations,
    byChannel: channelCounts,
    recentComms: recentComms.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      channel: c.channel,
      direction: c.direction,
      subject: c.subject,
      bodyText: c.bodyText.slice(0, 160),
      occurredAt: c.occurredAt,
      client: c.client,
    })),
    staleOpenCount: staleOpen.length,
    recentClients: clients,
  });
}
