import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: { clients: [], comms: [], files: [], projects: [] } });
  }

  const [clients, comms, files, projects] = await Promise.all([
    db.client.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      take: 6,
      select: { id: true, name: true, company: true, status: true, accentColor: true },
    }),
    db.communication.findMany({
      where: {
        OR: [
          { subject: { contains: q } },
          { bodyText: { contains: q } },
          { fromValue: { contains: q } },
        ],
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
      select: {
        id: true,
        clientId: true,
        channel: true,
        subject: true,
        bodyText: true,
        occurredAt: true,
        client: { select: { id: true, name: true } },
      },
    }),
    db.fileItem.findMany({
      where: { fileName: { contains: q } },
      take: 6,
      select: { id: true, fileName: true, folder: true, clientId: true, client: { select: { id: true, name: true } } },
    }),
    db.project.findMany({
      where: { title: { contains: q } },
      take: 6,
      select: { id: true, title: true, status: true, clientId: true, client: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    results: {
      clients: clients.map((c) => ({ ...c, kind: "client" as const })),
      comms: comms.map((c) => ({
        ...c,
        kind: "comm" as const,
        preview: c.bodyText.slice(0, 120),
      })),
      files: files.map((f) => ({ ...f, kind: "file" as const })),
      projects: projects.map((p) => ({ ...p, kind: "project" as const })),
    },
  });
}
