"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNav } from "@/components/portal/nav-store";
import { useCurrentUser } from "@/components/portal/user-store";
import { apiGet, apiPost, apiPatch } from "@/components/portal/query-hooks";
import { StatusBadge } from "@/components/portal/common/status-badge";
import { ChannelIcon } from "@/components/portal/common/channel-icon";
import { AiSummaryDialog, AiDraftButton } from "@/components/portal/common/ai-assistant";
import { PortalPreviewButton } from "@/components/portal/common/portal-preview";
import { cn } from "@/lib/utils";
import {
  channelMeta,
  relativeTime,
  shortTime,
  dayDividerLabel,
  formatDuration,
  formatBytes,
  initials,
  parseTags,
  type ChannelKind,
} from "@/lib/format";
import { sanitizeHtml } from "@/lib/sanitize";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Play,
  Pause,
  Send,
  StickyNote,
  Globe,
  Mail,
  MessageSquare,
  Pencil,
  Inbox as InboxIcon,
  BellOff,
  Clock,
  CheckCircle2,
  FileText,
  FolderClosed,
  FilePlus,
  Upload,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}
interface TeamResponse { team: TeamMember[] }

interface ClientContact {
  id: string;
  type: string;
  value: string;
  label: string;
  isPrimary: boolean;
  createdAt?: string;
}

interface Milestone {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  position: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assigneeId: string | null;
  dueDate: string | null;
  assignee: { id: string; fullName: string } | null;
}

interface Project {
  id: string;
  title: string;
  status: string;
  stage: string;
  dueDate: string | null;
  position: number;
  milestones: Milestone[];
  tasks: Task[];
}

interface FileItem {
  id: string;
  clientId: string;
  projectId: string | null;
  folder: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  uploadedById: string | null;
  uploader: { id: string; fullName: string } | null;
  sharedWithClient: boolean;
  createdAt: string;
}

interface Approval {
  id: string;
  clientId: string;
  projectId: string | null;
  fileId: string | null;
  title: string;
  status: string;
  decidedById: string | null;
  decidedAt: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; title: string } | null;
  file: { id: string; fileName: string; mimeType: string } | null;
  decider: { id: string; fullName: string } | null;
}

interface FormFieldDef {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface FormResponseRow {
  id: string;
  formId: string;
  clientId: string | null;
  answersJson: Record<string, unknown>;
  status: string;
  submittedAt: string;
}

interface FormItem {
  id: string;
  clientId: string | null;
  title: string;
  description: string;
  schemaJson: FormFieldDef[];
  status: string;
  responses: FormResponseRow[];
  createdAt: string;
  updatedAt: string;
}

interface ClientDetail {
  id: string;
  name: string;
  company: string | null;
  status: string;
  tags: string[];
  ownerId: string | null;
  owner: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
  customFields: Record<string, unknown>;
  notes: string;
  accentColor: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: ClientContact[];
  projects: Project[];
  files: FileItem[];
  approvals: Approval[];
  forms: FormItem[];
}

interface ClientHealth {
  lastContact: { occurredAt: string; channel: string } | null;
  openCount: number;
  nextMilestone: { title: string; dueDate: string | null; projectTitle: string } | null;
  pendingApprovals: number;
  totalComms: number;
}

interface ClientDetailResponse {
  client: ClientDetail;
  health: ClientHealth;
}

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

interface Communication {
  id: string;
  clientId: string | null;
  channel: string;
  direction: string;
  provider: string;
  providerMessageId: string | null;
  threadKey: string | null;
  subject: string;
  bodyText: string;
  bodyHtmlSanitized: string;
  summary: string | null;
  transcript: string | null;
  audioUrl: string | null;
  durationSec: number | null;
  fromValue: string;
  toValue: string;
  status: string;
  assignedTo: string | null;
  visibleToClient: boolean;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; company: string | null; accentColor: string } | null;
  assignee: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
  attachments: Attachment[];
}

interface CommunicationsResponse {
  communications: Communication[];
}

// ============================================================
// Shared constants
// ============================================================

const ACCENT_RING: Record<string, string> = {
  violet: "bg-accent text-accent-foreground",
  emerald: "bg-emerald text-emerald-foreground",
  sky: "bg-sky text-sky-foreground",
  amber: "bg-amber text-amber-foreground",
  rose: "bg-rose text-rose-foreground",
};

const ACCENT_DOT: Record<string, string> = {
  violet: "var(--accent)",
  emerald: "var(--emerald-foreground)",
  sky: "var(--sky-foreground)",
  amber: "var(--amber-foreground)",
  rose: "var(--rose-foreground)",
};

const SENDING_IDENTITY = "support@onboardwithus.com";
const STORAGE_CAP_BYTES = 1024 * 1024 * 1024; // 1 GB

// ============================================================
// Main component
// ============================================================

export function ClientDetail({ clientId }: { clientId: string }) {
  const user = useCurrentUser((s) => s.user);
  const nav = useNav();
  const qc = useQueryClient();
  const reduce = useReducedMotion();

  const { data, isLoading, error, refetch } = useQuery<ClientDetailResponse>({
    queryKey: ["client", clientId],
    queryFn: () => apiGet<ClientDetailResponse>(`/api/portal/clients/${clientId}`),
  });

  const { data: teamData } = useQuery<TeamResponse>({
    queryKey: ["team"],
    queryFn: () => apiGet<TeamResponse>("/api/portal/team"),
  });
  const team = teamData?.team ?? [];

  // Resolve the actual Profile.id for the current user. The user-store uses
  // the literal "owner" id, but the seeded owner Profile has a cuid id. To
  // avoid FK violations when posting comms / uploading files / deciding
  // approvals, look the user up in /api/portal/team by email and use that id.
  const actorId = React.useMemo(() => {
    if (!user) return null;
    const match = team.find((m) => m.email === user.email);
    return match?.id ?? user.id;
  }, [user, team]);

  // Lifted UI state shared between sidebar actions and tabs
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const focusComposer = React.useRef(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const client = data?.client;
  const health = data?.health;

  // When "Log note" is clicked in the sidebar, switch tab + signal composer to focus
  React.useEffect(() => {
    if (focusComposer.current && nav.clientTab === "timeline") {
      // wait a tick so the textarea mounts
      const t = window.setTimeout(() => {
        composerRef.current?.focus();
        focusComposer.current = false;
      }, 50);
      return () => window.clearTimeout(t);
    }
  }, [nav.clientTab]);

  const triggerLogNote = () => {
    nav.setClientTab("timeline");
    focusComposer.current = true;
  };

  const triggerUpload = () => {
    nav.setClientTab("files");
    setUploadOpen(true);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-foreground">
            <AlertCircle className="h-4 w-4" />
            Failed to load client.
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !client || !health) {
    return <DetailSkeleton />;
  }

  const accent = ACCENT_RING[client.accentColor] ?? ACCENT_RING.violet;

  return (
    <div className="space-y-5">
      {/* Header */}
      <Header
        client={client}
        accentClass={accent}
        onBack={() => nav.setView("clients")}
        onEdit={() => setEditOpen(true)}
        onLinkIncoming={() => {
          nav.setInboxFilter("unmatched");
          nav.setView("inbox");
        }}
      />

      {/* Health strip */}
      <HealthStrip health={health} />

      {/* Tabs + sidebar layout */}
      <Tabs
        value={nav.clientTab}
        onValueChange={(v) => nav.setClientTab(v)}
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-4">
          <TabsList className="flex h-9 w-full overflow-x-auto sm:w-fit scrollbar-thin">
            <TabsTrigger value="timeline" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderClosed className="h-3.5 w-3.5" /> Projects
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] tabular">
                {client.projects.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Files
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] tabular">
                {client.files.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approvals
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] tabular">
                {client.approvals.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-1.5">
              <FilePlus className="h-3.5 w-3.5" /> Forms
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] tabular">
                {client.forms.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-0">
            <TimelineTab
              clientId={clientId}
              client={client}
              composerRef={composerRef}
              actorId={actorId}
            />
          </TabsContent>
          <TabsContent value="projects" className="mt-0">
            <ProjectsTab client={client} />
          </TabsContent>
          <TabsContent value="files" className="mt-0">
            <FilesTab
              client={client}
              uploadOpen={uploadOpen}
              onUploadOpenChange={setUploadOpen}
              actorId={actorId}
            />
          </TabsContent>
          <TabsContent value="approvals" className="mt-0">
            <ApprovalsTab client={client} actorId={actorId} />
          </TabsContent>
          <TabsContent value="forms" className="mt-0">
            <FormsTab client={client} />
          </TabsContent>
          <TabsContent value="details" className="mt-0">
            <DetailsTab client={client} team={team} actorId={actorId} />
          </TabsContent>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-1">
          <Sidebar
            client={client}
            team={team}
            accentClass={accent}
            onLogNote={triggerLogNote}
            onRequestApproval={() => nav.setClientTab("approvals")}
            onUploadFile={triggerUpload}
            onEdit={() => setEditOpen(true)}
          />
        </div>
      </Tabs>

      {/* Edit sheet (controlled at this level so sidebar / header can open it) */}
      <EditClientSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        team={team}
        actorId={actorId}
      />
    </div>
  );
}

// ============================================================
// Header
// ============================================================

function Header({
  client,
  accentClass,
  onBack,
  onEdit,
  onLinkIncoming,
}: {
  client: ClientDetail;
  accentClass: string;
  onBack: () => void;
  onEdit: () => void;
  onLinkIncoming: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onBack}
          aria-label="Back to clients"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className={cn("text-sm font-medium", accentClass)}>
            {initials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{client.name}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {client.company || "No company"}
            {client.owner && (
              <>
                {" · "}
                Owner: {client.owner.fullName}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PortalPreviewButton clientId={client.id} />
        <div className="hidden max-w-[280px] flex-wrap items-center gap-1 sm:flex">
          {client.tags.length === 0 ? (
            <span className="text-xs text-muted-foreground">No tags</span>
          ) : (
            client.tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                {t}
              </Badge>
            ))
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Client actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLinkIncoming}>
              <InboxIcon className="mr-2 h-3.5 w-3.5" /> Link incoming
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <BellOff className="mr-2 h-3.5 w-3.5" /> Snooze (soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================
// Health strip
// ============================================================

function HealthStrip({ health }: { health: ClientHealth }) {
  const last = health.lastContact;
  const next = health.nextMilestone;
  const items: { icon: React.ReactNode; label: string; value: string; sub?: string }[] = [
    {
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Last contact",
      value: last ? relativeTime(last.occurredAt) : "—",
      sub: last ? channelMeta[last.channel as ChannelKind]?.label ?? last.channel : undefined,
    },
    {
      icon: <InboxIcon className="h-3.5 w-3.5" />,
      label: "Open items",
      value: String(health.openCount),
      sub: `${health.totalComms} total comms`,
    },
    {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Next milestone",
      value: next ? next.title : "—",
      sub: next?.dueDate ? `Due ${shortTime(next.dueDate)}` : next?.projectTitle,
    },
    {
      icon: <FileText className="h-3.5 w-3.5" />,
      label: "Pending approvals",
      value: String(health.pendingApprovals),
      sub: health.pendingApprovals > 0 ? "Awaiting decision" : "All clear",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border bg-card p-3 surface-highlight"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="text-muted-foreground/80">{it.icon}</span>
            {it.label}
          </div>
          <p className="mt-1 truncate text-sm font-medium">{it.value}</p>
          {it.sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Timeline tab
// ============================================================

function TimelineTab({
  clientId,
  client,
  composerRef,
  actorId,
}: {
  clientId: string;
  client: ClientDetail;
  composerRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  actorId: string | null;
}) {
  const user = useCurrentUser((s) => s.user);
  const qc = useQueryClient();
  const reduce = useReducedMotion();

  const commsKey = React.useMemo(() => ["comms", clientId], [clientId]);
  const { data, isLoading, error, refetch } = useQuery<CommunicationsResponse>({
    queryKey: commsKey,
    queryFn: () =>
      apiGet<CommunicationsResponse>(
        `/api/portal/communications?clientId=${encodeURIComponent(clientId)}&limit=500`
      ),
  });

  const comms = data?.communications ?? [];
  // Reverse so oldest is at the top, newest at the bottom (chat-log feel)
  const ordered = React.useMemo(() => [...comms].reverse(), [comms]);

  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    // Scroll to bottom when ordered list changes
    bottomRef.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "auto" });
  }, [ordered.length, reduce]);

  // Group by day with dividers
  const grouped = React.useMemo(() => {
    const out: Array<{ type: "divider"; key: string; label: string } | { type: "comm"; key: string; comm: Communication }> = [];
    let lastDay = "";
    for (const c of ordered) {
      const d = new Date(c.occurredAt);
      const dayKey = d.toDateString();
      if (dayKey !== lastDay) {
        out.push({ type: "divider", key: `d-${dayKey}`, label: dayDividerLabel(d) });
        lastDay = dayKey;
      }
      out.push({ type: "comm", key: c.id, comm: c });
    }
    return out;
  }, [ordered]);

  // Composer state
  const [draft, setDraft] = React.useState("");
  const [channel, setChannel] = React.useState<"note" | "portal" | "email" | "sms">("note");
  const [sending, setSending] = React.useState(false);

  const primaryEmail = client.contacts.find((c) => c.type === "email" && c.isPrimary);
  const primaryPhone = client.contacts.find((c) => c.type === "phone" && c.isPrimary);
  const recipient =
    channel === "sms" || channel === "call"
      ? primaryPhone?.value
      : primaryEmail?.value ?? client.contacts.find((c) => c.type === "email")?.value;

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    if (!user) return;

    setSending(true);

    // Determine effective channel/direction/visibility
    const effectiveChannel: ChannelKind =
      channel === "portal" ? "portal" : "note"; // email/sms draft as note
    const direction = channel === "portal" ? "outbound" : "internal";
    const visibleToClient = channel === "portal";

    // Optimistic comm
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Communication = {
      id: tempId,
      clientId,
      channel: effectiveChannel,
      direction,
      provider: "manual",
      providerMessageId: null,
      threadKey: null,
      subject: "",
      bodyText: body,
      bodyHtmlSanitized: body,
      summary: null,
      transcript: null,
      audioUrl: null,
      durationSec: null,
      fromValue: SENDING_IDENTITY,
      toValue: recipient ?? "",
      status: "open",
      assignedTo: actorId,
      visibleToClient,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      client: { id: client.id, name: client.name, company: client.company, accentColor: client.accentColor },
      assignee: user
        ? { id: actorId ?? user.id, fullName: user.fullName, email: user.email, avatarUrl: null }
        : null,
      attachments: [],
    };

    // Insert optimistically at the head (since the array is newest-first)
    qc.setQueryData<CommunicationsResponse>(commsKey, (old) => ({
      communications: [optimistic, ...(old?.communications ?? [])],
    }));
    setDraft("");

    try {
      await apiPost("/api/portal/communications", {
        clientId,
        channel: effectiveChannel,
        direction,
        provider: "manual",
        bodyText: body,
        bodyHtmlSanitized: body,
        fromValue: SENDING_IDENTITY,
        toValue: recipient ?? "",
        status: "open",
        assignedTo: actorId,
        visibleToClient,
        actorId,
      });
      qc.invalidateQueries({ queryKey: commsKey });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      const verb = effectiveChannel === "portal" ? "Portal message sent" : "Note added";
      toast.success(verb);
    } catch (err) {
      // Roll back
      qc.setQueryData<CommunicationsResponse>(commsKey, (old) => ({
        communications: (old?.communications ?? []).filter((c) => c.id !== tempId),
      }));
      toast.error("Could not send. Please try again.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  };

  if (isLoading) return <TimelineSkeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-foreground">
            <AlertCircle className="h-4 w-4" />
            Could not load timeline.
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const channelTabs: { key: typeof channel; label: string; icon: React.ReactNode; hint?: string }[] = [
    { key: "note", label: "Note", icon: <StickyNote className="h-3 w-3" /> },
    { key: "portal", label: "Portal message", icon: <Globe className="h-3 w-3" /> },
    { key: "email", label: "Email", icon: <Mail className="h-3 w-3" />, hint: "Connect Gmail in Settings to send." },
    { key: "sms", label: "SMS", icon: <MessageSquare className="h-3 w-3" />, hint: "Connect OpenPhone in Settings to send." },
  ];

  return (
    <Card className="flex flex-col p-0">
      {/* Timeline toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{ordered.length} message{ordered.length === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AiSummaryButton clientId={clientId} />
        </div>
      </div>

      {/* Timeline stream */}
      <div className="max-h-[640px] min-h-[320px] flex-1 overflow-y-auto px-3 py-3 scrollbar-thin sm:px-4">
        {ordered.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No communications yet</p>
            <p className="text-xs text-muted-foreground">
              Send the first note or portal message below.
            </p>
          </div>
        ) : (
          <ol className="space-y-1">
            {grouped.map((item) =>
              item.type === "divider" ? (
                <li
                  key={item.key}
                  className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  <Separator className="flex-1 bg-border" />
                  <span>{item.label}</span>
                  <Separator className="flex-1 bg-border" />
                </li>
              ) : (
                <li key={item.key} className="py-1">
                  <TimelineItem comm={item.comm} reduce={reduce ?? false} />
                </li>
              )
            )}
            <li ref={bottomRef} />
          </ol>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-muted/30 p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {channelTabs.map((ct) => (
            <button
              key={ct.key}
              onClick={() => setChannel(ct.key)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                channel === ct.key
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={channel === ct.key}
            >
              {ct.icon}
              {ct.label}
            </button>
          ))}
        </div>

        {(channel === "email" || channel === "sms") && (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-amber/50 bg-amber/20 px-2.5 py-1.5 text-[11px] text-amber-foreground">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {channel === "email"
                ? "Connect Gmail in Settings to send. Your draft will be saved as an internal note for now."
                : "Connect OpenPhone in Settings to send. Your draft will be saved as an internal note for now."}
            </span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              channel === "portal"
                ? "Write a portal message to the client…"
                : "Add an internal note…  (⌘/Ctrl + Enter to send)"
            }
            rows={3}
            className="min-h-[72px] resize-none"
          />
          <div className="flex flex-col items-end gap-1.5">
            <AiDraftButton
              clientId={clientId}
              channel={channel}
              onApply={(d) => setDraft(d)}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => void send()}
                  disabled={sending || !draft.trim()}
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send (⌘ + Enter)</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            From <span className="font-mono">{SENDING_IDENTITY}</span>
            {recipient && (
              <>
                {" · "}
                To <span className="font-mono">{recipient}</span>
              </>
            )}
          </span>
          <span className="capitalize">
            {channel === "portal" ? "Visible to client" : "Internal only"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function AiSummaryButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-accent/40 text-accent-foreground hover:bg-accent/40"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Summarize
      </Button>
      <AiSummaryDialog clientId={clientId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function TimelineItem({ comm, reduce }: { comm: Communication; reduce: boolean }) {
  const isSystem = comm.channel === "system";
  const isInternal = comm.direction === "internal" && !isSystem && comm.channel !== "portal";
  const isCall = comm.channel === "call";
  const isEmail = comm.channel === "email";
  const channel = comm.channel as ChannelKind;
  const meta = channelMeta[channel] ?? channelMeta.system;

  if (isSystem) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="my-2 flex justify-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
          <ChannelIcon channel="system" className="h-4 w-4 border-transparent bg-transparent" />
          {comm.bodyText}
          <span className="ml-1 text-[10px] text-muted-foreground/80">{shortTime(comm.occurredAt)}</span>
        </span>
      </motion.div>
    );
  }

  // Alignment by direction
  const align = comm.direction === "inbound" ? "justify-start" : isInternal ? "justify-center" : "justify-end";

  const bubbleClass =
    comm.direction === "inbound"
      ? "border border-border bg-card"
      : isInternal
      ? "border border-dashed border-border bg-muted/30"
      : "border border-transparent bg-accent/60 text-accent-foreground";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("flex w-full", align)}
    >
      <div className={cn("max-w-[88%] sm:max-w-[78%]")}>
        <div className={cn("rounded-lg p-3 surface-highlight", bubbleClass)}>
          {/* Meta header */}
          <div className="mb-1.5 flex items-center gap-2">
            <ChannelIcon channel={channel} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px]">
                <span className={cn("font-medium", meta.color)}>{meta.label}</span>
                {comm.fromValue && (
                  <span className="text-muted-foreground">
                    from <span className="font-mono">{comm.fromValue}</span>
                  </span>
                )}
                {comm.toValue && (
                  <span className="text-muted-foreground">
                    to <span className="font-mono">{comm.toValue}</span>
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {shortTime(comm.occurredAt)}
            </span>
          </div>

          {/* Subject */}
          {comm.subject && (
            <p className="mb-1 text-xs font-semibold">{comm.subject}</p>
          )}

          {/* Body */}
          {isCall ? (
            <CallBody comm={comm} />
          ) : isEmail && comm.bodyHtmlSanitized ? (
            <EmailBody html={comm.bodyHtmlSanitized} text={comm.bodyText} />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{comm.bodyText}</p>
          )}

          {/* Attachments */}
          {comm.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {comm.attachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} />
              ))}
            </div>
          )}

          {/* Status pill for open / snoozed */}
          {comm.status && comm.status !== "open" && (
            <div className="mt-2">
              <StatusBadge status={comm.status} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmailBody({ html, text }: { html: string; text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const cleaned = React.useMemo(() => sanitizeHtml(html), [html]);
  const isLong = (text || "").length > 500;

  if (!cleaned) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
  }

  return (
    <div>
      <div
        className={cn(
          "prose-tight text-sm leading-relaxed",
          !expanded && isLong && "max-h-[120px] overflow-hidden"
        )}
        dangerouslySetInnerHTML={{ __html: cleaned }}
      />
      {!expanded && isLong && (
        <div className="relative -mt-6 bg-gradient-to-t from-card to-transparent pt-3">
          <button
            onClick={() => setExpanded(true)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Show more
          </button>
        </div>
      )}
      {expanded && isLong && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-1 text-[11px] font-medium text-muted-foreground hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  );
}

function CallBody({ comm }: { comm: Communication }) {
  const [playing, setPlaying] = React.useState(false);
  const [tab, setTab] = React.useState<"summary" | "transcript">("summary");
  const [showTranscript, setShowTranscript] = React.useState(false);

  return (
    <div className="space-y-2">
      {/* Player row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform hover:scale-105"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <div className="flex-1">
          <div className="h-6 w-full overflow-hidden rounded bg-muted/60">
            <div
              className={cn(
                "flex h-full items-center gap-0.5 px-1",
                playing ? "animate-pulse" : ""
              )}
            >
              {Array.from({ length: 32 }).map((_, i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-accent-foreground/70"
                  style={{
                    height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%`,
                    opacity: playing ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <span className="font-mono text-[11px] tabular text-muted-foreground">
          {formatDuration(comm.durationSec)}
        </span>
      </div>

      {/* Summary */}
      {comm.summary && (
        <div className="rounded-md border border-border bg-muted/30 p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <p className="mt-1 text-sm leading-relaxed">{comm.summary}</p>
        </div>
      )}

      {/* Transcript toggle */}
      {comm.transcript && (
        <div>
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
            {showTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showTranscript && (
            <pre className="mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-2.5 text-[11px] leading-relaxed scrollbar-thin">
              {comm.transcript}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: Attachment }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px]">
      <FileMimeIcon mime={attachment.mimeType} className="h-3 w-3 text-muted-foreground" />
      <span className="max-w-[160px] truncate">{attachment.fileName}</span>
      <span className="text-muted-foreground">{formatBytes(attachment.sizeBytes)}</span>
    </span>
  );
}

function FileMimeIcon({ mime, className }: { mime: string; className?: string }) {
  // All mime types render as FileText in this minimal client. Keeping this a
  // real component (rather than a `const Icon = ...` lookup) keeps the React
  // Compiler happy.
  return <FileText className={className} />;
}

function TimelineSkeleton() {
  return (
    <Card className="p-0">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <div className="w-3/4 space-y-2 rounded-lg border border-border bg-card p-3">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// Projects tab
// ============================================================

function ProjectsTab({ client }: { client: ClientDetail }) {
  if (client.projects.length === 0) {
    return (
      <EmptyTab
        icon={<FolderClosed className="h-5 w-5" />}
        title="No projects yet"
        description="Create the first project from the Projects view."
      />
    );
  }
  return (
    <div className="space-y-3">
      {client.projects.map((p) => {
        const milestonesDone = p.milestones.filter((m) => m.completed).length;
        const milestonePct = p.milestones.length === 0 ? 0 : Math.round((milestonesDone / p.milestones.length) * 100);
        const tasksByStatus = p.tasks.reduce<Record<string, number>>((acc, t) => {
          acc[t.status] = (acc[t.status] ?? 0) + 1;
          return acc;
        }, {});
        return (
          <Card key={p.id} className="p-0">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                  <StatusBadge status={p.stage.toLowerCase().replace(" ", "_")} />
                </div>
                <CardDescription className="text-xs">
                  {p.status}
                  {p.dueDate && ` · due ${shortTime(p.dueDate)}`}
                </CardDescription>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Milestones</span>
                  <span className="font-mono tabular">
                    {milestonesDone}/{p.milestones.length}
                  </span>
                </div>
                <Progress value={milestonePct} className="h-1.5" />
              </div>

              {/* Milestone chips */}
              <div className="flex flex-wrap gap-1.5">
                {p.milestones.map((m) => (
                  <span
                    key={m.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                      m.completed
                        ? "border-emerald/40 bg-emerald/20 text-emerald-foreground"
                        : "border-border bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {m.completed && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {m.title}
                    {m.dueDate && !m.completed && (
                      <span className="text-[10px] text-muted-foreground">· {shortTime(m.dueDate)}</span>
                    )}
                  </span>
                ))}
              </div>

              {/* Tasks by status */}
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Tasks
                </p>
                {p.tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {p.tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 py-1.5">
                        <StatusBadge status={t.status} />
                        <span className="flex-1 truncate text-xs">{t.title}</span>
                        {t.assignee && (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-muted text-[9px]">
                              {initials(t.assignee.fullName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {t.dueDate && (
                          <span className="text-[10px] text-muted-foreground">{shortTime(t.dueDate)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {Object.keys(tasksByStatus).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {Object.entries(tasksByStatus).map(([s, n]) => (
                      <span key={s} className="rounded-md bg-muted/50 px-1.5 py-0.5">
                        {s}: <span className="font-mono tabular">{n}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// Files tab
// ============================================================

function FilesTab({
  client,
  uploadOpen,
  onUploadOpenChange,
  actorId,
}: {
  client: ClientDetail;
  uploadOpen: boolean;
  onUploadOpenChange: (open: boolean) => void;
  actorId: string | null;
}) {
  const qc = useQueryClient();

  const files = client.files ?? [];
  const totalBytes = files.reduce((s, f) => s + f.sizeBytes, 0);
  const usagePct = Math.min(100, (totalBytes / STORAGE_CAP_BYTES) * 100);

  // Group by folder (computed inline; the React Compiler doesn't like a
  // useMemo here because `files` is later mutated via toggleShared — the
  // grouping is cheap enough that we just recompute each render).
  const grouped = (() => {
    const map = new Map<string, FileItem[]>();
    for (const f of files) {
      const key = f.folder || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries());
  })();

  const toggleShared = async (file: FileItem, next: boolean) => {
    // Optimistic update on the client query
    qc.setQueryData<ClientDetailResponse>(["client", client.id], (old) => {
      if (!old) return old;
      return {
        ...old,
        client: {
          ...old.client,
          files: old.client.files.map((f) => (f.id === file.id ? { ...f, sharedWithClient: next } : f)),
        },
      };
    });
    try {
      await apiPatch(`/api/portal/files/${file.id}`, { sharedWithClient: next });
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      toast.success(next ? "Shared with client" : "Hidden from client");
    } catch (err) {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      toast.error("Could not update file sharing.", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <CardTitle className="text-sm">File vault</CardTitle>
          <CardDescription className="text-xs">
            {files.length} files · {formatBytes(totalBytes)} of 1 GB used
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => onUploadOpenChange(true)}>
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload file
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Storage meter */}
        <div className="border-b border-border p-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Storage</span>
            <span className="font-mono tabular">{usagePct.toFixed(1)}%</span>
          </div>
          <Progress value={usagePct} className="h-1.5" />
        </div>

        {files.length === 0 ? (
          <EmptyTab
            inline
            icon={<FolderClosed className="h-5 w-5" />}
            title="No files yet"
            description="Upload a file to share with the client."
          />
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(([folder, filesInFolder]) => (
              <div key={folder} className="p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <FolderClosed className="h-3 w-3" />
                  {folder}
                </div>
                <ul className="space-y-1">
                  {filesInFolder.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                        <FileMimeIcon mime={f.mimeType} className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{f.fileName}</p>
                            {f.version > 1 && (
                              <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal">
                                v{f.version}
                              </Badge>
                            )}
                            {f.sharedWithClient && (
                              <Badge variant="outline" className="px-1 py-0 text-[9px] font-normal text-emerald-foreground">
                                shared
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {formatBytes(f.sizeBytes)}
                            {f.uploader && ` · ${f.uploader.fullName}`}
                            {" · "}
                            {shortTime(f.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`share-${f.id}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            Share
                          </Label>
                          <Switch
                            id={`share-${f.id}`}
                            checked={f.sharedWithClient}
                            onCheckedChange={(v) => void toggleShared(f, v)}
                            aria-label={`Toggle sharing for ${f.fileName}`}
                          />
                        </div>
                      </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={onUploadOpenChange}
        clientId={client.id}
        actorId={user?.id ?? null}
      />
    </Card>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  clientId,
  actorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  actorId: string | null;
}) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ fileName: "", folder: "General", mimeType: "application/pdf", sizeBytes: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fileName.trim()) {
      toast.error("File name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/portal/files", {
        clientId,
        folder: form.folder.trim() || "General",
        fileName: form.fileName.trim(),
        mimeType: form.mimeType || "application/octet-stream",
        sizeBytes: Number(form.sizeBytes) || 0,
        uploadedById: actorId,
        sharedWithClient: false,
      });
      toast.success(`Uploaded ${form.fileName.trim()}.`);
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      setForm({ fileName: "", folder: "General", mimeType: "application/pdf", sizeBytes: "" });
    } catch (err) {
      toast.error("Upload failed.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload file (mock)</DialogTitle>
          <DialogDescription>
            This is a metadata-only upload for the demo. No real file is stored.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="up-name">File name *</Label>
            <Input
              id="up-name"
              value={form.fileName}
              onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              placeholder="report-q3.pdf"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="up-folder">Folder</Label>
              <Input
                id="up-folder"
                value={form.folder}
                onChange={(e) => setForm({ ...form, folder: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="up-mime">MIME type</Label>
              <Input
                id="up-mime"
                value={form.mimeType}
                onChange={(e) => setForm({ ...form, mimeType: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="up-size">Size (bytes)</Label>
            <Input
              id="up-size"
              type="number"
              value={form.sizeBytes}
              onChange={(e) => setForm({ ...form, sizeBytes: e.target.value })}
              placeholder="128000"
            />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Approvals tab
// ============================================================

function ApprovalsTab({ client, actorId }: { client: ClientDetail; actorId: string | null }) {
  const qc = useQueryClient();
  const [pending, setPending] = React.useState<{ id: string; status: "approved" | "changes_requested" } | null>(null);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  if (client.approvals.length === 0) {
    return (
      <EmptyTab
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="No approvals yet"
        description="Request approval on a file or milestone to start a review."
      />
    );
  }

  const submit = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      await apiPatch(`/api/portal/approvals/${pending.id}`, {
        status: pending.status,
        comment: comment.trim(),
        decidedById: actorId,
      });
      toast.success(
        pending.status === "approved" ? "Approved" : "Changes requested"
      );
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["comms", client.id] });
      setPending(null);
      setComment("");
    } catch (err) {
      toast.error("Could not record decision.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border p-4">
        <CardTitle className="text-sm">Approvals</CardTitle>
        <CardDescription className="text-xs">
          {client.approvals.filter((a) => a.status === "pending").length} pending
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {client.approvals.map((a) => (
            <li key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <StatusBadge status={a.status} />
                    {a.project && <span>· {a.project.title}</span>}
                    {a.file && <span>· {a.file.fileName}</span>}
                    {a.decider && <span>· decided by {a.decider.fullName}</span>}
                    {a.decidedAt && <span>· {shortTime(a.decidedAt)}</span>}
                  </div>
                  {a.comment && (
                    <p className="mt-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs italic text-muted-foreground">
                      "{a.comment}"
                    </p>
                  )}
                </div>
                {a.status === "pending" && (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setPending({ id: a.id, status: "changes_requested" })}
                    >
                      Request changes
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPending({ id: a.id, status: "approved" })}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      {/* Decision dialog */}
      <Dialog open={!!pending} onOpenChange={(v) => { if (!v) { setPending(null); setComment(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending?.status === "approved" ? "Approve" : "Request changes"}
            </DialogTitle>
            <DialogDescription>
              Add an optional comment. A system event will be added to the timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="ap-comment">Comment</Label>
            <Textarea
              id="ap-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={
                pending?.status === "approved"
                  ? "Looks good — proceeding."
                  : "Please update…"
              }
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// Forms tab
// ============================================================

function FormsTab({ client }: { client: ClientDetail }) {
  const forms = client.forms.filter((f) => f.status === "published");
  if (forms.length === 0) {
    return (
      <EmptyTab
        icon={<FilePlus className="h-5 w-5" />}
        title="No published forms"
        description="Create a form and publish it from the Forms view."
      />
    );
  }
  return (
    <div className="space-y-3">
      {forms.map((f) => (
        <FormCard key={f.id} form={f} />
      ))}
    </div>
  );
}

function FormCard({ form }: { form: FormItem }) {
  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <CardTitle className="text-sm">{form.title}</CardTitle>
          <CardDescription className="text-xs">
            {form.responses.length} response{form.responses.length === 1 ? "" : "s"}
            {" · "}updated {relativeTime(form.updatedAt)}
          </CardDescription>
        </div>
        <StatusBadge status={form.status} />
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {/* Schema preview */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Schema
          </p>
          <ul className="space-y-1">
            {form.schemaJson.map((field) => (
              <li key={field.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-normal uppercase">
                  {field.type}
                </Badge>
                <span className="flex-1 truncate">{field.label}</span>
                {field.required && (
                  <span className="text-[10px] text-amber-foreground">required</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Responses */}
        {form.responses.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Responses
            </p>
            <ul className="space-y-2">
              {form.responses.map((r) => (
                <FormResponseRow key={r.id} response={r} schema={form.schemaJson} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormResponseRow({ response, schema }: { response: FormResponseRow; schema: FormFieldDef[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const answers = response.answersJson ?? {};
  return (
    <li className="rounded-md border border-border bg-muted/20">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="flex-1 text-[11px] text-muted-foreground">
          {response.clientId ?? "Anonymous"} · {shortTime(response.submittedAt)}
        </span>
        <StatusBadge status={response.status} />
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="border-t border-border p-2.5">
          <dl className="space-y-1">
            {schema.map((field) => (
              <div key={field.id} className="flex gap-2 text-xs">
                <dt className="w-1/3 shrink-0 text-muted-foreground">{field.label}</dt>
                <dd className="flex-1 break-words">{formatAnswer(answers[field.id])}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </li>
  );
}

function formatAnswer(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

// ============================================================
// Details tab
// ============================================================

function DetailsTab({
  client,
  team,
  actorId,
}: {
  client: ClientDetail;
  team: TeamMember[];
  actorId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    name: client.name,
    company: client.company ?? "",
    status: client.status as "active" | "prospect" | "paused" | "churned",
    tags: client.tags.join(", "),
    ownerId: client.ownerId ?? "",
    accentColor: client.accentColor as "violet" | "emerald" | "sky" | "amber" | "rose",
    notes: client.notes ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  // Contacts inline add
  const [newContact, setNewContact] = React.useState({ type: "email" as "email" | "phone", value: "", label: "" });
  const [addingContact, setAddingContact] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiPatch(`/api/portal/clients/${client.id}`, {
        name: form.name.trim(),
        company: form.company.trim() || null,
        status: form.status,
        tags: form.tags,
        ownerId: form.ownerId || null,
        accentColor: form.accentColor,
        notes: form.notes,
      });
      toast.success("Client updated.");
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error("Could not save.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const addContact = async () => {
    if (!newContact.value.trim()) return;
    setAddingContact(true);
    try {
      // Use the POST /clients/[id]/contacts flow — but there is no such endpoint.
      // We use the details PATCH to push contacts via customFields-style? No — the schema has
      // ClientContact as a separate model. The clients/[id] PATCH only updates top-level fields.
      // The simplest approach: add via POST /api/portal/clients/[id]/contacts — but no such route.
      // Workaround: store new contacts in customFields under "_pendingContacts" so a future
      // agent can pick them up. For now we surface them as a custom field.
      // Actually we'll show a friendly message saying it requires server support.
      toast.info("Adding contacts requires a server-side route. Coming soon.");
    } finally {
      setAddingContact(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="border-b border-border p-4">
        <CardTitle className="text-sm">Client details</CardTitle>
        <CardDescription className="text-xs">
          Edit core fields. Contacts and custom fields are read-only here for now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="d-name">Name *</Label>
            <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-company">Company</Label>
            <Input id="d-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="d-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger id="d-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-accent">Accent</Label>
            <Select value={form.accentColor} onValueChange={(v) => setForm({ ...form, accentColor: v as typeof form.accentColor })}>
              <SelectTrigger id="d-accent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violet">Violet</SelectItem>
                <SelectItem value="emerald">Emerald</SelectItem>
                <SelectItem value="sky">Sky</SelectItem>
                <SelectItem value="amber">Amber</SelectItem>
                <SelectItem value="rose">Rose</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="d-owner">Owner</Label>
            <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
              <SelectTrigger id="d-owner" className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-tags">Tags</Label>
          <Input id="d-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-notes">Notes</Label>
          <Textarea id="d-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <Separator />

        {/* Contacts */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contacts
            </p>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {client.contacts.length === 0 ? (
              <li className="p-3 text-xs text-muted-foreground">No contacts.</li>
            ) : (
              client.contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-2 p-2.5">
                  <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-normal uppercase">
                    {c.type}
                  </Badge>
                  <span className="flex-1 font-mono text-xs">{c.value}</span>
                  {c.label && <span className="text-[11px] text-muted-foreground">{c.label}</span>}
                  {c.isPrimary && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-normal text-emerald-foreground">
                      primary
                    </Badge>
                  )}
                </li>
              ))
            )}
          </ul>
          {/* Inline add */}
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="w-24">
              <Select
                value={newContact.type}
                onValueChange={(v) => setNewContact({ ...newContact, type: v as "email" | "phone" })}
              >
                <SelectTrigger className="w-full" aria-label="Contact type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                value={newContact.value}
                onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                placeholder={newContact.type === "email" ? "name@company.com" : "+1 415 555 0142"}
                aria-label="Contact value"
              />
            </div>
            <div className="w-28">
              <Input
                value={newContact.label}
                onChange={(e) => setNewContact({ ...newContact, label: e.target.value })}
                placeholder="work"
                aria-label="Contact label"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addContact}
              disabled={addingContact || !newContact.value.trim()}
            >
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </div>
        </div>

        <Separator />

        {/* Custom fields */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Custom fields (read-only)
          </p>
          <pre className="max-h-60 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 text-[11px] leading-relaxed scrollbar-thin">
{JSON.stringify(client.customFields ?? {}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sidebar (desktop) / Summary (mobile)
// ============================================================

function Sidebar({
  client,
  team,
  accentClass,
  onLogNote,
  onRequestApproval,
  onUploadFile,
  onEdit,
}: {
  client: ClientDetail;
  team: TeamMember[];
  accentClass: string;
  onLogNote: () => void;
  onRequestApproval: () => void;
  onUploadFile: () => void;
  onEdit: () => void;
}) {
  const owner = client.owner ? team.find((m) => m.id === client.owner!.id) ?? client.owner : null;
  return (
    <div className="space-y-3 lg:sticky lg:top-[68px]">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={cn("text-sm font-medium", accentClass)}>
              {initials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{client.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {client.company || "No company"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={client.status} />
          <span
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0 text-[10px] capitalize text-muted-foreground"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: ACCENT_DOT[client.accentColor] ?? ACCENT_DOT.violet }}
              aria-hidden
            />
            {client.accentColor}
          </span>
        </div>
      </Card>

      {/* Owner */}
      <Card className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Owner
        </p>
        {owner ? (
          <div className="mt-2 flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-[10px]">
                {initials(owner.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{owner.fullName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{owner.email}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Unassigned</p>
        )}
      </Card>

      {/* Contacts */}
      <Card className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Contacts
        </p>
        <ul className="mt-2 space-y-1.5">
          {client.contacts.length === 0 ? (
            <li className="text-xs text-muted-foreground">No contacts.</li>
          ) : (
            client.contacts.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{c.type === "email" ? "✉" : "☎"}</span>
                <span className="flex-1 truncate font-mono">{c.value}</span>
                {c.isPrimary && (
                  <span className="rounded-full bg-emerald/30 px-1.5 text-[9px] text-emerald-foreground">
                    primary
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </Card>

      {/* Custom fields */}
      {client.customFields && Object.keys(client.customFields).length > 0 && (
        <Card className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Custom fields
          </p>
          <dl className="mt-2 space-y-1">
            {Object.entries(client.customFields).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <dt className="w-1/2 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="flex-1 break-words">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Quick actions */}
      <Card className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Quick actions
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          <Button variant="outline" size="sm" className="justify-start" onClick={onLogNote}>
            <StickyNote className="mr-2 h-3.5 w-3.5" /> Log note
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={onRequestApproval}>
            <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Request approval
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={onUploadFile}>
            <Upload className="mr-2 h-3.5 w-3.5" /> Upload file
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit client
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Edit client sheet
// ============================================================

function EditClientSheet({
  open,
  onOpenChange,
  client,
  team,
  actorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientDetail;
  team: TeamMember[];
  actorId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    name: client.name,
    company: client.company ?? "",
    status: client.status as "active" | "prospect" | "paused" | "churned",
    tags: client.tags.join(", "),
    ownerId: client.ownerId ?? "",
    accentColor: client.accentColor as "violet" | "emerald" | "sky" | "amber" | "rose",
    notes: client.notes ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      setForm({
        name: client.name,
        company: client.company ?? "",
        status: client.status as typeof form.status,
        tags: client.tags.join(", "),
        ownerId: client.ownerId ?? "",
        accentColor: client.accentColor as typeof form.accentColor,
        notes: client.notes ?? "",
      });
    }
  }, [open, client]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch(`/api/portal/clients/${client.id}`, {
        name: form.name.trim(),
        company: form.company.trim() || null,
        status: form.status,
        tags: parseTags(form.tags),
        ownerId: form.ownerId || null,
        accentColor: form.accentColor,
        notes: form.notes,
      });
      toast.success("Client updated.");
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit client</SheetTitle>
          <SheetDescription>
            Update core fields. Changes are saved to the database.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Name *</Label>
            <Input id="e-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-company">Company</Label>
            <Input id="e-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger id="e-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-accent">Accent</Label>
              <Select value={form.accentColor} onValueChange={(v) => setForm({ ...form, accentColor: v as typeof form.accentColor })}>
                <SelectTrigger id="e-accent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="sky">Sky</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-tags">Tags</Label>
            <Input id="e-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-owner">Owner</Label>
            <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
              <SelectTrigger id="e-owner" className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-notes">Notes</Label>
            <Textarea id="e-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
          </div>
        </form>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Shared helpers
// ============================================================

function EmptyTab({
  icon,
  title,
  description,
  inline,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  inline?: boolean;
}) {
  return (
    <Card className={cn(!inline && "p-0")}>
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[520px] rounded-lg" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    </div>
  );
}
