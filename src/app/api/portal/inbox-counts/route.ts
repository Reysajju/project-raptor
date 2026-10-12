import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [open, unassigned, unmatched, snoozed, done, mine] = await Promise.all([
    db.communication.count({ where: { status: "open", clientId: { not: null } } }),
    db.communication.count({ where: { status: "open", assignedTo: null, clientId: { not: null } } }),
    db.communication.count({ where: { status: "open", clientId: null } }),
    db.communication.count({ where: { status: "snoozed" } }),
    db.communication.count({ where: { status: "done" } }),
    db.communication.count({ where: { status: "open", assignedTo: { not: null } } }),
  ]);

  return NextResponse.json({ open, unassigned, unmatched, snoozed, done, mine });
}
