import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await db.fileItem.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, title: true } },
      uploader: { select: { id: true, fullName: true } },
    },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ file });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.fileItem.update({
    where: { id },
    data: {
      ...(body.folder !== undefined && { folder: body.folder }),
      ...(body.sharedWithClient !== undefined && { sharedWithClient: body.sharedWithClient }),
      ...(body.fileName !== undefined && { fileName: body.fileName }),
    },
  });
  return NextResponse.json({ file: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.fileItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
