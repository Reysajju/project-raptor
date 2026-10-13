import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/auth/demo
 * Creates or resolves the demo user, creates a session, and returns it.
 * Used by the "Continue as demo user" button.
 */
export async function POST() {
  try {
    const demoEmail = "demo@raptorportal.app";

    // Find or create the demo user
    let user = await db.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: demoEmail,
          fullName: "Demo User",
          role: "owner",
          isDemo: true,
        },
      });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create a session
    const { randomBytes } = await import("crypto");
    const sessionToken = randomBytes(32).toString("hex");
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt: sessionExpiry,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isDemo: user.isDemo,
      },
    });
  } catch (err) {
    console.error("[auth/demo]", err);
    return NextResponse.json(
      { error: "Failed to create demo session" },
      { status: 500 }
    );
  }
}
