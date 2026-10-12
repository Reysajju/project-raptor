import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const forms = await db.form.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, company: true } },
      responses: {
        orderBy: { submittedAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  const mapped = forms.map((f) => ({
    ...f,
    schemaJson: f.schemaJson ? JSON.parse(f.schemaJson) : [],
    responses: f.responses.map((r) => ({
      ...r,
      answersJson: r.answersJson ? JSON.parse(r.answersJson) : {},
    })),
  }));
  return NextResponse.json({ forms: mapped });
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await db.form.create({
    data: {
      clientId: body.clientId ?? null,
      title: body.title,
      description: body.description ?? "",
      schemaJson: JSON.stringify(body.schema ?? []),
      status: body.status ?? "draft",
    },
  });
  return NextResponse.json({ form: created });
}
