import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/clients/[id]/relationship
 * Returns a chronological list of relationship milestones for the horizontal
 * timeline visualization. Each event has a type, date, title, and optional
 * detail. Types: first_contact, email, sms, call, portal, note, file, project,
 * milestone, approval, form.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  type Event = {
    type: string;
    date: string;
    title: string;
    detail?: string;
    icon: string;
  };

  const events: Event[] = [];

  // Client creation as the first event
  events.push({
    type: "created",
    date: client.createdAt.toISOString(),
    title: "Client added",
    detail: `${client.name} joined the directory`,
    icon: "user-plus",
  });

  // Communications (sample: first of each channel + most recent per channel)
  const comms = await db.communication.findMany({
    where: { clientId: id },
    orderBy: { occurredAt: "asc" },
    select: { channel: true, direction: true, subject: true, occurredAt: true },
  });

  const firstByChannel = new Map<string, typeof comms[number]>();
  for (const c of comms) {
    if (!firstByChannel.has(c.channel)) {
      firstByChannel.set(c.channel, c);
    }
  }

  const channelLabels: Record<string, string> = {
    email: "First email",
    sms: "First text message",
    call: "First phone call",
    portal: "First portal message",
    note: "First internal note",
    system: "System event",
  };
  const channelIcons: Record<string, string> = {
    email: "mail",
    sms: "message",
    call: "phone",
    portal: "globe",
    note: "note",
    system: "zap",
  };

  for (const [ch, c] of firstByChannel) {
    if (ch === "system") continue;
    events.push({
      type: `first_${ch}`,
      date: c.occurredAt.toISOString(),
      title: channelLabels[ch] ?? `First ${ch}`,
      detail: c.subject || undefined,
      icon: channelIcons[ch] ?? "activity",
    });
  }

  // Projects + milestones
  const projects = await db.project.findMany({
    where: { clientId: id },
    include: {
      milestones: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const p of projects) {
    events.push({
      type: "project",
      date: p.createdAt.toISOString(),
      title: `Project started: ${p.title}`,
      detail: p.status,
      icon: "kanban",
    });
    for (const m of p.milestones) {
      if (m.completed && m.dueDate) {
        events.push({
          type: "milestone",
          date: m.dueDate.toISOString(),
          title: `Milestone reached: ${m.title}`,
          detail: p.title,
          icon: "check",
        });
      }
    }
  }

  // Files
  const files = await db.fileItem.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "asc" },
    select: { fileName: true, createdAt: true, sharedWithClient: true },
    take: 20,
  });
  for (const f of files) {
    events.push({
      type: "file",
      date: f.createdAt.toISOString(),
      title: `File uploaded: ${f.fileName}`,
      detail: f.sharedWithClient ? "Shared with client" : undefined,
      icon: "file",
    });
  }

  // Approvals
  const approvals = await db.approval.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "asc" },
    select: { title: true, status: true, createdAt: true, decidedAt: true },
  });
  for (const a of approvals) {
    events.push({
      type: "approval",
      date: a.createdAt.toISOString(),
      title: `Approval requested: ${a.title}`,
      icon: "check-circle",
    });
    if (a.decidedAt) {
      events.push({
        type: "approval_decision",
        date: a.decidedAt.toISOString(),
        title: a.status === "approved" ? `Approved: ${a.title}` : `Changes requested: ${a.title}`,
        icon: a.status === "approved" ? "check" : "alert",
      });
    }
  }

  // Forms
  const forms = await db.form.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "asc" },
    select: { title: true, status: true, createdAt: true },
  });
  for (const f of forms) {
    events.push({
      type: "form",
      date: f.createdAt.toISOString(),
      title: `Form created: ${f.title}`,
      icon: "clipboard",
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute span
  const firstDate = events[0]?.date ?? client.createdAt.toISOString();
  const lastDate = events[events.length - 1]?.date ?? new Date().toISOString();
  const spanDays = Math.max(1, Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (24 * 60 * 60 * 1000)));

  return NextResponse.json({
    events,
    count: events.length,
    firstDate,
    lastDate,
    spanDays,
  });
}
