import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [count, recent] = await Promise.all([
    db.notification.count({ where: { readAt: null } }),
    db.notification.findMany({
      where: { readAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({ count, recent });
}

export async function PATCH() {
  await db.notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
