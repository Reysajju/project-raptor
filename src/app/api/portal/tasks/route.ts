import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/tasks
 * Returns tasks, optionally filtered by projectId or assigneeId
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const assigneeId = searchParams.get("assigneeId");

    const tasks = await db.task.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      include: {
        project: { select: { id: true, title: true, clientId: true } },
        assignee: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[GET /api/portal/tasks]", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

/**
 * POST /api/portal/tasks
 * Body: { projectId, title, assigneeId?, dueDate?, status?, position? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, title, assigneeId, dueDate, status = "todo", position = 0 } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: "projectId and title are required" },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        projectId,
        title: title.trim(),
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        position: Number(position) || 0,
      },
      include: {
        project: { select: { id: true, title: true } },
        assignee: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ ok: true, task });
  } catch (err) {
    console.error("[POST /api/portal/tasks]", err);
    return NextResponse.json(
      { error: "Failed to create task", details: (err as Error).message },
      { status: 500 }
    );
  }
}
