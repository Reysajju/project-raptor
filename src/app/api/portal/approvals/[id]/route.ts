import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const approval = await db.approval.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, title: true } },
      file: { select: { id: true, fileName: true, mimeType: true, storagePath: true } },
      decider: { select: { id: true, fullName: true } },
    },
  });
  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ approval });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.approval.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.comment !== undefined && { comment: body.comment }),
      ...(body.decidedById !== undefined && { decidedById: body.decidedById }),
      ...((body.status === "approved" || body.status === "changes_requested") && {
        decidedAt: new Date(),
      }),
    },
  });

  // System event on client timeline
  const approval = await db.approval.findUnique({
    where: { id },
    select: { clientId: true, title: true, status: true },
  });
  if (approval && body.status) {
    const verb = body.status === "approved" ? "approved" : "requested changes on";
    await db.communication.create({
      data: {
        clientId: approval.clientId,
        channel: "system",
        direction: "internal",
        bodyText: `Decision recorded: ${verb} "${approval.title}".${body.comment ? ` Comment: "${body.comment}".` : ""}`,
        status: "done",
        occurredAt: new Date(),
      },
    });
  }

  await db.auditLog.create({
    data: {
      actorId: body.decidedById ?? null,
      action: `approval.${body.status ?? "update"}`,
      entity: "approval",
      entityId: id,
      metadataJson: JSON.stringify({ comment: body.comment ?? "" }),
    },
  });

  return NextResponse.json({ approval: updated });
}
