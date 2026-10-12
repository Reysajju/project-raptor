import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Team members list. */
export async function GET() {
  const team = await db.profile.findMany({
    where: { role: { in: ["owner", "admin"] } },
    orderBy: { role: "asc" },
  });
  return NextResponse.json({ team });
}
