import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const items = await db.client.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: {
      contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
      owner: { select: { id: true, fullName: true } },
      _count: {
        select: {
          communications: { where: { status: "open" } },
          projects: { where: { status: { in: ["active", "planning"] } } },
          files: true,
          approvals: { where: { status: "pending" } },
        },
      },
    },
  });

  const mapped = items.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company ?? "",
    status: c.status,
    tags: c.tags ? c.tags.split(",").filter(Boolean) : [],
    ownerId: c.ownerId,
    owner: c.owner,
    accentColor: c.accentColor,
    notes: c.notes,
    contacts: c.contacts,
    customFields: c.customFields ? JSON.parse(c.customFields) : {},
    openItems: c._count.communications + c._count.approvals,
    activeProjects: c._count.projects,
    fileCount: c._count.files,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json({ clients: mapped });
}

import { sendInvitationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = (body.name ?? "").toString().trim();
    const rawEmail = (body.email ?? "").toString().trim();
    const normalizedEmail = rawEmail ? rawEmail.toLowerCase() : "";
    const role = (body.role === "member" ? "member" : "client") as "client" | "member";
    const company = body.company ? String(body.company).trim() : null;
    const status = body.status ?? (role === "client" ? "active" : "active");
    const accentColor = body.accentColor ?? "violet";
    const notes = body.notes ? String(body.notes).trim() : "";
    const tags = Array.isArray(body.tags)
      ? body.tags.join(",")
      : body.tags
      ? String(body.tags)
      : "";
    const ownerId = body.ownerId || null;
    const projectId = body.projectId ? String(body.projectId).trim() : null;
    const taskTitle = body.taskTitle ? String(body.taskTitle).trim() : null;
    const sendInvite = body.sendInvite !== false; // default true if email provided

    if (!name) {
      return NextResponse.json(
        { error: "Client or member name is required" },
        { status: 400 }
      );
    }

    // 1. Create the Client record (if role is client, or if company/name given)
    let createdClient = null;
    if (role === "client" || company) {
      createdClient = await db.client.create({
        data: {
          name: name,
          company: company || name,
          status: status,
          tags: tags,
          ownerId: ownerId,
          accentColor: accentColor,
          notes: notes,
          customFields: JSON.stringify(body.customFields ?? {}),
        },
      });

      // Add primary email contact if email given
      if (normalizedEmail) {
        await db.clientContact.create({
          data: {
            clientId: createdClient.id,
            type: "email",
            value: rawEmail,
            valueNormalized: normalizedEmail,
            label: "Work",
            isPrimary: true,
          },
        }).catch((e) => {
          // Contact might already exist
          console.warn("[POST /api/portal/clients] contact creation non-fatal:", e);
        });
      }

      // Seed additional contacts if provided in body.contacts
      if (Array.isArray(body.contacts)) {
        for (const ct of body.contacts) {
          if (!ct.value) continue;
          await db.clientContact.create({
            data: {
              clientId: createdClient.id,
              type: ct.type || "email",
              value: ct.value,
              valueNormalized:
                ct.type === "email"
                  ? String(ct.value).toLowerCase()
                  : String(ct.value).replace(/[^+\d]/g, ""),
              label: ct.label ?? "",
              isPrimary: ct.isPrimary ?? false,
            },
          }).catch(() => null);
        }
      }
    }

    // 2. Create or sync Profile & User if email is provided
    let profile = null;
    let user = null;
    let inviteToken = null;
    let inviteLink = null;
    let emailSent = false;
    let createdTask = null;

    if (normalizedEmail) {
      // Find or create profile
      profile = await db.profile.upsert({
        where: { email: normalizedEmail },
        update: {
          fullName: name,
          role: role,
          ...(createdClient ? { clientId: createdClient.id } : {}),
        },
        create: {
          email: normalizedEmail,
          fullName: name,
          role: role,
          clientId: createdClient?.id ?? null,
        },
      });

      // Find or create User for auth
      user = await db.user.upsert({
        where: { email: normalizedEmail },
        update: {
          fullName: name,
          role: role,
        },
        create: {
          email: normalizedEmail,
          fullName: name,
          role: role,
        },
      });

      // 3. Create initial assigned task if requested
      if (projectId && taskTitle) {
        try {
          createdTask = await db.task.create({
            data: {
              projectId: projectId,
              title: taskTitle,
              status: "todo",
              assigneeId: profile.id,
            },
          });
        } catch (taskErr) {
          console.error("[POST /api/portal/clients] task create error:", taskErr);
        }
      }

      // 4. Generate invitation magic-link token if sendInvite is true
      if (sendInvite) {
        const { randomBytes } = await import("crypto");
        inviteToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.magicLinkToken.create({
          data: {
            token: inviteToken,
            email: normalizedEmail,
            userId: user.id,
            expiresAt,
          },
        });

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (req.headers.get("origin") ?? "http://localhost:3000");
        inviteLink = `${appUrl}/?token=${inviteToken}&invited=true`;

        // Fetch project title for the email if assigned
        let projectName: string | undefined = undefined;
        if (projectId) {
          const prj = await db.project.findUnique({
            where: { id: projectId },
            select: { title: true },
          });
          projectName = prj?.title;
        }

        // Send email via Gmail SMTP
        try {
          await sendInvitationEmail({
            email: normalizedEmail,
            name: name,
            role: role,
            inviteLink,
            companyName: company || createdClient?.name,
            projectName,
            taskTitle: taskTitle || undefined,
            inviterName: "Raptor Portal Team",
          });
          emailSent = true;
        } catch (emailErr) {
          console.warn("[POST /api/portal/clients] email send failed or not configured:", (emailErr as Error).message);
          emailSent = false;
        }
      }
    }

    // 5. Audit log
    await db.auditLog.create({
      data: {
        actorId: body.actorId ?? null,
        action: role === "client" ? "client.created_and_invited" : "team.member_invited",
        entity: "client",
        entityId: createdClient?.id ?? profile?.id,
        metadataJson: JSON.stringify({
          name,
          email: normalizedEmail,
          role,
          emailSent,
          hasTask: !!createdTask,
        }),
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      client: createdClient,
      profile,
      user,
      task: createdTask,
      inviteLink,
      emailSent,
      message: emailSent
        ? `Invitation sent to ${normalizedEmail}!`
        : inviteLink
        ? `Account ready. Share the invitation link with ${name}.`
        : `Client record created successfully.`,
    });
  } catch (err) {
    console.error("[POST /api/portal/clients] critical error:", err);
    return NextResponse.json(
      {
        error: "Failed to create client or send invitation",
        details: (err as Error).message,
      },
      { status: 500 }
    );
  }
}

