import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await db.form.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, company: true } },
      responses: true,
    },
  });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    form: {
      ...form,
      schemaJson: form.schemaJson ? JSON.parse(form.schemaJson) : [],
      responses: form.responses.map((r) => ({
        ...r,
        answersJson: r.answersJson ? JSON.parse(r.answersJson) : {},
      })),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db.form.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.schema !== undefined && { schemaJson: JSON.stringify(body.schema) }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });
  return NextResponse.json({ form: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.form.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
