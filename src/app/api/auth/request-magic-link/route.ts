import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/auth/request-magic-link
 * Body: { email: string }
 * Generates a magic link token, stores it in the DB (15-min TTL), and
 * returns the token + a preview of the link. In production this would
 * send an email; for the demo we return the link directly so the user
 * can click it.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").toString().trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    // Check if a user already exists with this email
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true },
    });

    // Generate a secure random token
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");

    // Store the token with 15-min TTL
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.magicLinkToken.create({
      data: {
        token,
        email,
        userId: existingUser?.id ?? null,
        expiresAt,
      },
    });

    // In production: send email with the link.
    // For demo: return the link directly.
    const magicLink = `${new URL(req.url).origin}/?token=${token}`;

    return NextResponse.json({
      ok: true,
      magicLink,
      isNewUser: !existingUser,
      email,
      expiresIn: "15 minutes",
    });
  } catch (err) {
    console.error("[auth/request-magic-link]", err);
    return NextResponse.json(
      { error: "Failed to generate magic link" },
      { status: 500 }
    );
  }
}
