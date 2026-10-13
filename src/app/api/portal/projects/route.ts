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
  const body = await req.json();
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
}
