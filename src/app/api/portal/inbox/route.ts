import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Shared inbox: returns grouped threads for a given filter.
 * Filters: all | mine | unassigned | unmatched | snoozed | done
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const userId = searchParams.get("userId") ?? undefined;

  const where: Record<string, unknown> = {};
  switch (filter) {
    case "mine":
      where.status = "open";
      where.assignedTo = userId ?? null;
      break;
    case "unassigned":
      where.status = "open";
      where.assignedTo = null;
      where.clientId = { not: null };
      break;
    case "unmatched":
      where.status = "open";
      where.clientId = null;
      break;
    case "snoozed":
      where.status = "snoozed";
      break;
    case "done":
      where.status = "done";
      break;
    case "all":
    default:
      where.status = { in: ["open", "snoozed"] };
      break;
  }

  const items = await db.communication.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }],
    take: 100,
    include: {
      client: { select: { id: true, name: true, company: true, accentColor: true } },
      assignee: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });

  // Group by threadKey (if present), else by id (standalone)
  const groups = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    const key = item.threadKey ?? item.id;
    const existing = groups.get(key);
    if (!existing || item.occurredAt > existing.occurredAt) {
      groups.set(key, item);
    }
  }

  const threads = Array.from(groups.values()).map((latest) => ({
    id: latest.id,
    threadKey: latest.threadKey ?? latest.id,
    channel: latest.channel,
    direction: latest.direction,
    subject: latest.subject,
    preview: latest.bodyText.slice(0, 120),
    fromValue: latest.fromValue,
    occurredAt: latest.occurredAt,
    status: latest.status,
    clientId: latest.clientId,
    client: latest.client,
    assignee: latest.assignee,
    provider: latest.provider,
    visibleToClient: latest.visibleToClient,
  }));

  return NextResponse.json({ threads, filter });
}
