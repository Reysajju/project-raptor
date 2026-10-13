import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const list = await db.integrationCredential.findMany({
    orderBy: { provider: "asc" },
  });
  return NextResponse.json({ integrations: list });
}
