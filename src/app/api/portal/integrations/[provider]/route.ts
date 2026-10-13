import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const body = await req.json();
  const updated = await db.integrationCredential.update({
    where: { provider },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.accountLabel !== undefined && { accountLabel: body.accountLabel }),
      ...(body.lastSyncAt !== undefined && { lastSyncAt: body.lastSyncAt }),
      ...(body.watchExpiresAt !== undefined && {
        watchExpiresAt: body.watchExpiresAt,
      }),
    },
  });
  return NextResponse.json({ credential: updated });
}
