"use client";

import * as React from "react";
import { useNav } from "@/components/portal/nav-store";
import { useCurrentUser } from "@/components/portal/user-store";
import { useQueryState, apiGet } from "@/components/portal/query-hooks";
import { accentGradient } from "@/lib/accent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Eye,
  CheckCircle2,
  FileText,
  MessageSquare,
  Upload,
  Bell,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime, shortTime, initials } from "@/lib/format";
import type { ChannelKind } from "@/lib/format";

interface PortalData {
  client: {
    id: string;
    name: string;
    company: string | null;
    accentColor: string;
    logoUrl: string | null;
  };
  approvals: {
    id: string;
    title: string;
    status: string;
    comment: string;
    createdAt: string;
    file?: { fileName: string } | null;
  }[];
  forms: {
    id: string;
    title: string;
    description: string;
    status: string;
    responses: { submittedAt: string }[];
  }[];
  messages: {
    id: string;
    bodyText: string;
    direction: string;
    channel: string;
    occurredAt: string;
    visibleToClient: boolean;
  }[];
  projects: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    milestones: { title: string; completed: boolean }[];
  }[];
  files: {
    id: string;
    fileName: string;
    folder: string;
    version: number;
    createdAt: string;
  }[];
}

interface ClientDetail {
  client: PortalData["client"] & {
    forms: PortalData["forms"];
    approvals: PortalData["approvals"];
    files: PortalData["files"];
    projects: PortalData["projects"];
  };
  health: {
    pendingApprovals: number;
    nextMilestone: { title: string; dueDate: string | null } | null;
  };
}

export function PortalPreviewButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        title="Preview what this client sees in their portal"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Portal preview</span>
      </Button>
      <PortalPreviewDialog clientId={clientId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function PortalPreviewDialog({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useQueryState<{ client: ClientDetail["client"]; health: ClientDetail["health"] }>(
    `client-${clientId}`,
    `/api/portal/clients/${clientId}`,
    { enabled: open }
  );

  // Fetch comms for the portal messages (visibleToClient only)
  const [messages, setMessages] = React.useState<PortalData["messages"]>([]);
  React.useEffect(() => {
    if (!open || !clientId) return;
    apiGet<{ communications: PortalData["messages"] }>(
      `/api/portal/communications?clientId=${clientId}&limit=200`
    ).then((d) => {
      setMessages(d.communications.filter((c) => c.visibleToClient || c.direction === "outbound"));
    }).catch(() => setMessages([]));
  }, [open, clientId]);

  const client = data?.client;
  const accentColor = client?.accentColor ?? "violet";
  const pendingApprovals = client?.approvals.filter((a) => a.status === "pending") ?? [];
  const publishedForms = client?.forms ?? [];
  const sharedFiles = client?.files ?? [];
  const projects = client?.projects ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>Client portal preview</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-foreground">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold">Client portal preview</span>
            <Badge variant="secondary" className="text-[10px]">
              What {client?.name?.split(" ")[0] ?? "the client"} sees
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading || !client ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
            {/* Portal header (what client sees) */}
            <div className="border-b border-border px-5 py-5" style={{ background: accentGradient(client.accentColor) }}>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">
                    {initials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Welcome back,</p>
                  <h2 className="text-xl font-semibold">{client.name}</h2>
                  {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
                </div>
              </div>
            </div>

            {/* "Needs your attention" cards */}
            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Needs your attention
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <AttentionCard
                    icon={CheckCircle2}
                    count={pendingApprovals.length}
                    label="Approvals"
                    tone="amber"
                  />
                  <AttentionCard
                    icon={FileText}
                    count={publishedForms.length}
                    label="Forms"
                    tone="sky"
                  />
                  <AttentionCard
                    icon={MessageSquare}
                    count={messages.filter((m) => m.direction === "outbound").length}
                    label="Messages"
                    tone="emerald"
                  />
                </div>
              </div>

              {/* Pending approvals */}
              {pendingApprovals.length > 0 && (
                <Card className="surface-highlight">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-foreground" />
                      Pending approvals
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Please review and approve or request changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pendingApprovals.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          {a.file && (
                            <p className="truncate text-xs text-muted-foreground">{a.file.fileName}</p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Requested {relativeTime(a.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Request changes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Project progress ribbon */}
              {projects.length > 0 && (
                <Card className="surface-highlight">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Project progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {projects.map((p) => {
                      const total = p.milestones.length;
                      const done = p.milestones.filter((m) => m.completed).length;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      return (
                        <div key={p.id}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium">{p.title}</span>
                            <span className="font-mono text-muted-foreground">{done}/{total}</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {p.milestones.map((m, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                                  m.completed
                                    ? "bg-emerald text-emerald-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {m.completed && <CheckCircle2 className="h-2.5 w-2.5" />}
                                {m.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Messages thread (visible to client) */}
              <Card className="surface-highlight">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Messages</CardTitle>
                  <CardDescription className="text-xs">
                    Your conversation with our team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No messages yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {messages.slice(-8).map((m) => {
                        const fromUs = m.direction === "outbound";
                        return (
                          <div
                            key={m.id}
                            className={cn("flex", fromUs ? "justify-start" : "justify-end")}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] rounded-lg px-3 py-2 text-xs",
                                fromUs
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{m.bodyText}</p>
                              <p className={cn("mt-1 text-[10px]", fromUs ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {shortTime(m.occurredAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shared files */}
              {sharedFiles.length > 0 && (
                <Card className="surface-highlight">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Upload className="h-4 w-4" />
                      Shared files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {sharedFiles.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-xs">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate font-medium">{f.fileName}</span>
                          <span className="text-muted-foreground">v{f.version}</span>
                          <span className="text-muted-foreground">{relativeTime(f.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <p className="pt-2 text-center text-[10px] text-muted-foreground">
                This is a preview of the client portal experience.
                <br />
                Clients see a simplified, mobile-first interface with one primary action per screen.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttentionCard({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  tone: "amber" | "sky" | "emerald";
}) {
  const toneClass = {
    amber: "bg-amber/20 text-amber-foreground",
    sky: "bg-sky/20 text-sky-foreground",
    emerald: "bg-emerald/20 text-emerald-foreground",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card p-3 surface-highlight">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-mono text-lg font-semibold tabular leading-none">{count}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
