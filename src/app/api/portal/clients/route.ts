import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
      owner: { select: { id: true, fullName: true } },
      _count: {
        select: {
          communications: { where: { status: "open" } },
          projects: { where: { status: { in: ["active", "planning"] } } },
          files: true,
          approvals: { where: { status: "pending" } },
        },
      },
    },
  });

  const mapped = items.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company ?? "",
    status: c.status,
    tags: c.tags ? c.tags.split(",").filter(Boolean) : [],
    ownerId: c.ownerId,
    owner: c.owner,
    accentColor: c.accentColor,
    notes: c.notes,
    contacts: c.contacts,
    customFields: c.customFields ? JSON.parse(c.customFields) : {},
    openItems: c._count.communications + c._count.approvals,
    activeProjects: c._count.projects,
    fileCount: c._count.files,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json({ clients: mapped });
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await db.client.create({
    data: {
      name: body.name,
      company: body.company ?? null,
      status: body.status ?? "prospect",
      tags: Array.isArray(body.tags) ? body.tags.join(",") : (body.tags ?? ""),
      ownerId: body.ownerId ?? null,
      accentColor: body.accentColor ?? "violet",
      notes: body.notes ?? "",
      customFields: JSON.stringify(body.customFields ?? {}),
    },
  });

  // Seed contacts if provided
  if (Array.isArray(body.contacts)) {
    for (const ct of body.contacts) {
      await db.clientContact.create({
        data: {
          clientId: created.id,
          type: ct.type,
          value: ct.value,
          valueNormalized:
            ct.type === "email" ? String(ct.value).toLowerCase() : String(ct.value).replace(/[^+\d]/g, ""),
          label: ct.label ?? "",
          isPrimary: ct.isPrimary ?? false,
        },
      });
    }
  }

  await db.auditLog.create({
    data: {
      actorId: body.actorId ?? null,
      action: "client.created",
      entity: "client",
      entityId: created.id,
      metadataJson: JSON.stringify({ name: created.name }),
    },
  });

  return NextResponse.json({ client: created });
}
