import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      contacts: true,
      owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      projects: {
        orderBy: { position: "asc" },
        include: {
          milestones: { orderBy: { position: "asc" } },
          tasks: { orderBy: { position: "asc" }, include: { assignee: { select: { id: true, fullName: true, email: true, avatarUrl: true } } } },
        },
      },
      files: {
        orderBy: { createdAt: "desc" },
        include: { uploader: { select: { id: true, fullName: true } } },
      },
      approvals: {
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { id: true, title: true } },
          file: { select: { id: true, fileName: true } },
          decider: { select: { id: true, fullName: true } },
        },
      },
      forms: {
        where: { status: "published" },
        include: { responses: true },
      },
      _count: {
        select: {
          communications: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Health strip: last contact, open items, next milestone, pending approvals
  const lastComm = await db.communication.findFirst({
    where: { clientId: id },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true, channel: true },
  });
  const openCount = await db.communication.count({
    where: { clientId: id, status: "open" },
  });
  const pendingApprovals = client.approvals.filter((a) => a.status === "pending");

  // Next upcoming milestone across all projects
  let nextMilestone: { title: string; dueDate: Date | null; projectTitle: string } | null = null;
  for (const p of client.projects) {
    for (const m of p.milestones) {
      if (!m.completed && m.dueDate) {
        if (!nextMilestone || m.dueDate < (nextMilestone.dueDate ?? new Date(0))) {
          nextMilestone = { title: m.title, dueDate: m.dueDate, projectTitle: p.title };
        }
      }
    }
  }

  return NextResponse.json({
    client: {
      ...client,
      tags: client.tags ? client.tags.split(",").filter(Boolean) : [],
      customFields: client.customFields ? JSON.parse(client.customFields) : {},
      forms: client.forms.map((f) => ({
        ...f,
        schemaJson: f.schemaJson ? JSON.parse(f.schemaJson) : [],
        responses: f.responses.map((r) => ({
          ...r,
          answersJson: r.answersJson ? JSON.parse(r.answersJson) : {},
        })),
      })),
    },
    health: {
      lastContact: lastComm,
      openCount,
      nextMilestone,
      pendingApprovals: pendingApprovals.length,
      totalComms: client._count.communications,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.client.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.company !== undefined && { company: body.company }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.tags !== undefined && {
        tags: Array.isArray(body.tags) ? body.tags.join(",") : body.tags,
      }),
      ...(body.ownerId !== undefined && { ownerId: body.ownerId }),
      ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.customFields !== undefined && {
        customFields: JSON.stringify(body.customFields),
      }),
    },
  });
  return NextResponse.json({ client: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
