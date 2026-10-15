import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

/**
 * GET /api/portal/team
 * Returns team members and collaborators (owner, admin, member, client).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    const team = await db.profile.findMany({
      where: roleFilter
        ? { role: roleFilter }
        : { role: { in: ["owner", "admin", "member", "client"] } },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      include: {
        client: { select: { id: true, name: true, company: true } },
      },
    });

    return NextResponse.json({ team });
  } catch (err) {
    console.error("[GET /api/portal/team]", err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

/**
 * POST /api/portal/team
 * Invites a team member or collaborator.
 * Body: { email, fullName?, role? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = (body.email ?? "").toString().trim();
    const email = rawEmail.toLowerCase();
    const fullName = (body.fullName ?? rawEmail.split("@")[0] ?? "").toString().trim();
    const role = (body.role ?? "member").toString().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    // 1. Upsert Profile
    const profile = await db.profile.upsert({
      where: { email },
      update: {
        fullName: fullName || undefined,
        role: role,
      },
      create: {
        email,
        fullName: fullName || email.split("@")[0],
        role: role,
      },
    });

    // 2. Upsert User
    const user = await db.user.upsert({
      where: { email },
      update: {
        fullName: fullName || undefined,
        role: role,
      },
      create: {
        email,
        fullName: fullName || email.split("@")[0],
        role: role,
      },
    });

    // 3. Create Magic Link Invitation Token (7-day validity)
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.magicLinkToken.create({
      data: {
        token,
        email,
        userId: user.id,
        expiresAt,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get("origin") ?? "http://localhost:3000");
    const inviteLink = `${appUrl}/?token=${token}&type=invitation`;

    // 4. Send Email via Gmail SMTP
    let emailSent = false;
    try {
      await sendInvitationEmail({
        email,
        name: profile.fullName,
        role,
        inviteLink,
        inviterName: "Raptor Portal Team",
      });
      emailSent = true;
    } catch (emailErr) {
      console.warn("[POST /api/portal/team] email send failed or not configured:", (emailErr as Error).message);
      emailSent = false;
    }

    // 5. Audit Log
    await db.auditLog.create({
      data: {
        action: "team.member_invited",
        entity: "profile",
        entityId: profile.id,
        metadataJson: JSON.stringify({ email, fullName: profile.fullName, role, emailSent }),
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      member: profile,
      inviteLink,
      emailSent,
      message: emailSent
        ? `Invitation sent to ${email}!`
        : `Member added. Invitation link generated.`,
    });
  } catch (err) {
    console.error("[POST /api/portal/team]", err);
    return NextResponse.json(
      { error: "Failed to invite team member", details: (err as Error).message },
      { status: 500 }
    );
  }
}
