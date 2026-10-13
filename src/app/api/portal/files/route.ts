import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const files = await db.fileItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, company: true, accentColor: true } },
      project: { select: { id: true, title: true } },
      uploader: { select: { id: true, fullName: true } },
    },
  });
  const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  return NextResponse.json({ files, totalBytes, count: files.length });
}

export async function POST(req: Request) {
  const body = await req.json();
  // Bump version if file with same name exists in same client+folder
  const existing = await db.fileItem.findFirst({
    where: { clientId: body.clientId, fileName: body.fileName, folder: body.folder ?? "General" },
    orderBy: { version: "desc" },
  });
  const version = existing ? existing.version + 1 : 1;

  const created = await db.fileItem.create({
    data: {
      clientId: body.clientId,
      projectId: body.projectId ?? null,
      folder: body.folder ?? "General",
      fileName: body.fileName,
      storagePath: body.storagePath ?? `/mock-storage/files/${body.fileName}`,
      mimeType: body.mimeType ?? "application/octet-stream",
      sizeBytes: body.sizeBytes ?? 0,
      version,
      uploadedById: body.uploadedById ?? null,
      sharedWithClient: body.sharedWithClient ?? false,
    },
  });

  // System event on client timeline
  await db.communication.create({
    data: {
      clientId: body.clientId,
      channel: "system",
      direction: "internal",
      bodyText: `File uploaded: "${created.fileName}"${created.sharedWithClient ? " shared with client." : "."}`,
      status: "done",
      occurredAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: body.uploadedById ?? null,
      action: "file.uploaded",
      entity: "file",
      entityId: created.id,
      metadataJson: JSON.stringify({ fileName: created.fileName, version: created.version }),
    },
  });

  return NextResponse.json({ file: created });
}
