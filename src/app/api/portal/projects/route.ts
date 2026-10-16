import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: [{ position: "asc" }],
    include: {
      client: { select: { id: true, name: true, company: true, accentColor: true } },
      milestones: { orderBy: { position: "asc" } },
      tasks: {
        orderBy: [{ status: "asc" }, { position: "asc" }],
        include: { assignee: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      },
      files: { select: { id: true, fileName: true, mimeType: true } },
    },
  });

  const byStage: Record<string, typeof projects> = {
    "To Do": [],
    "In Progress": [],
    Review: [],
    Done: [],
  };
  for (const p of projects) {
    const stage = mapStage(p.stage, p.status);
    (byStage[stage] ?? (byStage["To Do"] as typeof projects)).push(p);
  }

  return NextResponse.json({ projects, byStage });
}

function mapStage(stage: string, status: string): string {
  if (status === "done" || stage === "Done") return "Done";
  if (status === "review" || stage === "Review") return "Review";
  if (status === "active" || stage === "In Progress") return "In Progress";
  return "To Do";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.clientId) {
      return NextResponse.json(
        { error: "Project title and client are required" },
        { status: 400 }
      );
    }

    const client = await db.client.findUnique({
      where: { id: body.clientId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json(
        { error: "Selected client does not exist" },
        { status: 400 }
      );
    }

    const created = await db.project.create({
      data: {
        clientId: body.clientId,
        title: body.title,
        status: body.status ?? "planning",
        stage: body.stage ?? "To Do",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        position: body.position ?? 0,
      },
    });
  if (Array.isArray(body.milestones)) {
    for (let i = 0; i < body.milestones.length; i++) {
      const m = body.milestones[i];
      await db.milestone.create({
        data: {
          projectId: created.id,
          title: m.title,
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          position: i,
        },
      });
    }
  }
  return NextResponse.json({ project: created });
  } catch (err) {
    console.error("[POST /api/portal/projects]", err);
    return NextResponse.json(
      { error: "Failed to create project", details: (err as Error).message },
      { status: 500 }
    );
  }
}
