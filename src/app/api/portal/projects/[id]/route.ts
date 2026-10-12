import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true, accentColor: true } },
      milestones: { orderBy: { position: "asc" } },
      tasks: {
        orderBy: [{ status: "asc" }, { position: "asc" }],
        include: { assignee: { select: { id: true, fullName: true } } },
      },
      files: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.project.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.stage !== undefined && { stage: body.stage }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
    },
  });

  // If stage/status changed, write a system event to the client timeline
  if (body.stage !== undefined || body.status !== undefined) {
    const p = await db.project.findUnique({ where: { id }, select: { clientId: true, title: true, stage: true, status: true } });
    if (p) {
      await db.communication.create({
        data: {
          clientId: p.clientId,
          channel: "system",
          direction: "internal",
          bodyText: `Project status changed: "${p.title}" moved to ${p.stage || p.status}.`,
          status: "done",
          occurredAt: new Date(),
        },
      });
    }
  }

  return NextResponse.json({ project: updated });
}
