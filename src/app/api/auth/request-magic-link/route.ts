import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";

/**
 * POST /api/auth/request-magic-link
 * Body: { email: string }
 *
 * Generates a magic link token (15-min TTL), stores it in the DB,
 * and sends a real email via Gmail SMTP. Returns { ok: true, isNewUser }.
 *
 * Environment variables required:
 *   GMAIL_USER=your-email@gmail.com
 *   GMAIL_APP_PASSWORD=your-16-char-app-password
 *
 * The actual magic link is NOT returned in the response (security best
 * practice — the link goes only to the email). However, if Gmail creds
 * are not configured, falls back to returning the link directly (demo mode).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").toString().trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    // Check if a user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true },
    });

    // Generate a secure random token
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");

    // Store with 15-min TTL
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await db.magicLinkToken.create({
      data: {
        token,
        email,
        userId: existingUser?.id ?? null,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const magicLink = `${appUrl}/?token=${token}`;
    const isNewUser = !existingUser;

    // Try to send a real email via Gmail SMTP
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      try {
        await sendMagicLinkEmail(email, magicLink, isNewUser);
        return NextResponse.json({
          ok: true,
          emailSent: true,
          isNewUser,
          message: `Magic link sent to ${email}. Check your inbox (and spam folder).`,
        });
      } catch (emailErr) {
        console.error("[auth/request-magic-link] email send failed", emailErr);
        // Fall back to returning the link directly if email fails
        return NextResponse.json({
          ok: true,
          emailSent: false,
          magicLink,
          isNewUser,
          message: "Email sending failed — use the link below to sign in.",
          error: (emailErr as Error).message,
        });
      }
    }

    // Demo mode — no Gmail creds configured, return the link directly
    return NextResponse.json({
      ok: true,
      emailSent: false,
      magicLink,
      isNewUser,
      email,
      message: "Gmail not configured — demo mode. Use the link below.",
    });
  } catch (err) {
    console.error("[auth/request-magic-link]", err);
    return NextResponse.json(
      { error: "Failed to generate magic link" },
      { status: 500 }
    );
  }
}
