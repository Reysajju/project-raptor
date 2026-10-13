import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/auth/session?token=<sessionToken>
 * Validates a session token and returns the user info.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      isDemo: session.user.isDemo,
    },
  });
}
