import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/auth/verify-magic-link
 * Body: { token: string }
 * Validates the token, marks it as used, creates or resolves the user,
 * creates a session, and returns the session token + user info.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = (body.token ?? "").toString();

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Look up the token
    const magicLink = await db.magicLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (magicLink.usedAt) {
      return NextResponse.json({ error: "This link has already been used" }, { status: 410 });
    }

    if (magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 410 });
    }

    // Mark the token as used
    await db.magicLinkToken.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Resolve or create the user
    let user = magicLink.user;
    if (!user) {
      // New signup — create the user
      user = await db.user.create({
        data: {
          email: magicLink.email,
          fullName: magicLink.email.split("@")[0],
          role: "member",
        },
      });
      // Link the magic link to the new user
      await db.magicLinkToken.update({
        where: { id: magicLink.id },
        data: { userId: user.id },
      });
    }

    // Resolve or sync Profile (so task assignments, team listings, and client access work)
    let profile = await db.profile.findUnique({
      where: { email: user.email },
      include: { client: true },
    });

    if (!profile) {
      profile = await db.profile.create({
        data: {
          email: user.email,
          fullName: user.fullName || user.email.split("@")[0],
          role: user.role,
        },
        include: { client: true },
      });
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create a session (7-day TTL)
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
        id: profile.id,
        userId: user.id,
        email: user.email,
        fullName: profile.fullName || user.fullName,
        role: profile.role || user.role,
        clientId: profile.clientId,
        clientName: profile.client?.name,
        isDemo: user.isDemo,
      },
    });
  } catch (err) {
    console.error("[auth/verify-magic-link]", err);
    return NextResponse.json(
      { error: "Verification failed", details: (err as Error).message },
      { status: 500 }
    );
  }
}
