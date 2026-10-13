import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const approvals = await db.approval.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, name: true, company: true, accentColor: true } },
      project: { select: { id: true, title: true } },
      file: { select: { id: true, fileName: true, mimeType: true } },
      decider: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json({ approvals });
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await db.approval.create({
    data: {
      clientId: body.clientId,
      projectId: body.projectId ?? null,
      fileId: body.fileId ?? null,
      title: body.title,
      status: body.status ?? "pending",
    },
  });

  await db.communication.create({
    data: {
      clientId: body.clientId,
      channel: "system",
      direction: "internal",
      bodyText: `Approval requested: "${created.title}".`,
      status: "done",
      occurredAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: body.actorId ?? null,
      action: "approval.request",
      entity: "approval",
      entityId: created.id,
      metadataJson: JSON.stringify({ title: created.title }),
    },
  });

  return NextResponse.json({ approval: created });
}
