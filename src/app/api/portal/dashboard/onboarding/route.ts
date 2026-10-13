import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/dashboard/onboarding
 * Computes onboarding progress for a new team member. Each checklist item
 * is derived from existing data (not separately persisted) so it always
 * reflects the actual workspace state.
 */
export async function GET() {
  const [integrations, clients, comms, projects, files, approvals, webhookEvents, teamMembers] = await Promise.all([
    db.integrationCredential.count({ where: { status: "connected" } }),
    db.client.count({ where: { deletedAt: null } }),
    db.communication.count({ where: { direction: { in: ["outbound", "internal"] } } }),
    db.project.count(),
    db.fileItem.count(),
    db.approval.count(),
    db.webhookEvent.count(),
    db.profile.count({ where: { role: { in: ["owner", "admin"] } } }),
  ]);

  const items = [
    {
      id: "connect-integration",
      label: "Connect an integration",
      detail: "Hook up Gmail, OpenPhone, or RingCentral in Settings",
      done: integrations > 0,
      href: "settings",
    },
    {
      id: "create-client",
      label: "Create your first client",
      detail: "Add a client to the directory",
      done: clients > 0,
      href: "clients",
    },
    {
      id: "send-message",
      label: "Send a message or note",
      detail: "Use the composer on a client's timeline",
      done: comms > 0,
      href: "clients",
    },
    {
      id: "create-project",
      label: "Create a project",
      detail: "Set up a project with milestones and tasks",
      done: projects > 0,
      href: "projects",
    },
    {
      id: "upload-file",
      label: "Upload a file",
      detail: "Add a file to the vault",
      done: files > 0,
      href: "files",
    },
    {
      id: "request-approval",
      label: "Request an approval",
      detail: "Send a deliverable for client sign-off",
      done: approvals > 0,
      href: "approvals",
    },
    {
      id: "try-simulator",
      label: "Try the webhook simulator",
      detail: "Fire a mock event in Settings to test the pipeline",
      done: webhookEvents > 0,
      href: "settings",
    },
    {
      id: "invite-team",
      label: "Invite a team member",
      detail: "Add a colleague to the workspace",
      done: teamMembers > 1,
      href: "settings",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  return NextResponse.json({
    items,
    doneCount,
    totalCount,
    pct,
    isComplete: doneCount === totalCount,
  });
}
