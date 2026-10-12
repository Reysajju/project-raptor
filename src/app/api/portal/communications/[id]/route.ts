import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comm = await db.communication.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true } },
      assignee: { select: { id: true, fullName: true } },
      attachments: true,
    },
  });
  if (!comm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ communication: comm });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updated = await db.communication.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo || null }),
      ...(body.clientId !== undefined && { clientId: body.clientId || null }),
      ...(body.summary !== undefined && { summary: body.summary }),
      ...(body.transcript !== undefined && { transcript: body.transcript }),
      ...(body.visibleToClient !== undefined && { visibleToClient: body.visibleToClient }),
      ...(body.snoozedUntil !== undefined && { snoozedUntil: body.snoozedUntil }),
    },
  });

  if (body.audit) {
    await db.auditLog.create({
      data: {
        actorId: body.actorId ?? null,
        action: body.audit.action,
        entity: "communication",
        entityId: id,
        metadataJson: JSON.stringify(body.audit.metadata ?? {}),
      },
    });
  }

  return NextResponse.json({ communication: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.communication.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
