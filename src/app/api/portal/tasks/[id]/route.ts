import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  let safeAssigneeId: string | null | undefined = undefined;
  if (body.assigneeId !== undefined) {
    if (!body.assigneeId || body.assigneeId === "unassigned" || body.assigneeId === "none") {
      safeAssigneeId = null;
    } else {
      try {
        const p = await db.profile.findFirst({
          where: {
            OR: [
              { id: body.assigneeId },
              { email: String(body.assigneeId).toLowerCase() },
            ],
          },
          select: { id: true },
        });
        safeAssigneeId = p?.id ?? null;
      } catch {
        safeAssigneeId = null;
      }
    }
  }

  const updated = await db.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.assigneeId !== undefined && { assigneeId: safeAssigneeId }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.position !== undefined && { position: body.position }),
    },
  });
  return NextResponse.json({ task: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
