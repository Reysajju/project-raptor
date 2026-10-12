import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "100");
  const entity = searchParams.get("entity");
  const action = searchParams.get("action");

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = { contains: action };

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
  });

  const mapped = logs.map((l) => ({
    ...l,
    metadataJson: l.metadataJson ? JSON.parse(l.metadataJson) : {},
  }));

  return NextResponse.json({ logs: mapped });
}
