import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const created = await db.formResponse.create({
    data: {
      formId: id,
      clientId: body.clientId ?? null,
      answersJson: JSON.stringify(body.answers ?? {}),
    },
  });

  // System event on client timeline
  if (body.clientId) {
    await db.communication.create({
      data: {
        clientId: body.clientId,
        channel: "system",
        direction: "internal",
        bodyText: `Form response submitted.`,
        status: "done",
        occurredAt: new Date(),
      },
    });
  }

  return NextResponse.json({ response: created });
}
