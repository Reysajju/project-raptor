"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNav } from "../nav-store";
import { apiGet, apiPatch, useQueryState } from "../query-hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  ChevronLeft,
  UserMinus,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  CalendarClock,
  CornerUpLeft,
  Inbox as InboxIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChannelIcon } from "../common/channel-icon";
import { StatusBadge } from "../common/status-badge";
import { AiSummaryDialog } from "../common/ai-assistant";
import { channelMeta, initials, type ChannelKind } from "@/lib/format";
import { CommCard } from "./comm-card";
import { TriageCard } from "./triage-card";
import { ReplyComposer } from "./reply-composer";
import type {
  Communication,
  CommunicationResponse,
  CommunicationsResponse,
  TeamMember,
  TeamResponse,
} from "./types";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "snoozed", label: "Snoozed" },
  { value: "done", label: "Done" },
] as const;

const SNOOZE_OPTIONS = [
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next-week", label: "Next week" },
  { value: "next-month", label: "Next month" },
] as const;

interface ConversationPanelProps {
  threadId: string | null;
  threadLatestPreview?: Communication | null;
  /** True on mobile when this panel takes the full viewport. */
  onBack?: () => void;
  /** Imperatively opens the assign menu when the user hits "A". */
  openAssignSignal?: number;
  /** Imperatively focuses the reply textarea when the user hits "R". */
  focusReplySignal?: number;
  invalidateInbox: () => void;
}

export function ConversationPanel({
  threadId,
  threadLatestPreview,
  onBack,
  openAssignSignal,
  focusReplySignal,
  invalidateInbox,
}: ConversationPanelProps) {
  const queryClient = useQueryClient();
  const replyTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [assignMenuOpen, setAssignMenuOpen] = React.useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = React.useState(false);
  const [snoozeOpen, setSnoozeOpen] = React.useState(false);
  const [summaryOpen, setSummaryOpen] = React.useState(false);

  // 1. Fetch the latest comm in the thread to learn clientId + threadKey.
  const latestQuery = useQuery<CommunicationResponse>({
    queryKey: ["inbox-thread-latest", threadId],
    queryFn: () =>
      apiGet<CommunicationResponse>(
        `/api/portal/communications/${threadId}`,
      ),
    enabled: !!threadId,
  });

  const latest =
    latestQuery.data?.communication ?? threadLatestPreview ?? null;
  const clientId = latest?.clientId ?? null;
  const threadKey = latest?.threadKey ?? threadId ?? null;
  const unmatched = !clientId;

  // 2. Fetch all comms for the matched client (to build the timeline).
  const commsQuery = useQuery<CommunicationsResponse>({
    queryKey: ["inbox-thread-comms", threadId, clientId],
    queryFn: () =>
      apiGet<CommunicationsResponse>(
        `/api/portal/communications?clientId=${encodeURIComponent(clientId!)}&limit=500`,
      ),
    enabled: !!clientId,
  });

  const timeline = React.useMemo(() => {
    if (!latest) return [];
    if (!clientId) return [latest];
    const all = commsQuery.data?.communications ?? [];
    const filtered = all.filter(
      (c) => c.threadKey === threadKey || c.id === threadId,
    );
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );
    return sorted;
  }, [latest, clientId, commsQuery.data?.communications, threadKey, threadId]);

  // 3. PATCH helpers for status / assignee / clientId.
  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPatch<CommunicationResponse>(
        `/api/portal/communications/${threadId}`,
        body,
      ),
    onSuccess: (_data) => {
      invalidateInbox();
      void queryClient.invalidateQueries({
        queryKey: ["inbox-thread-latest", threadId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inbox-thread-comms", threadId],
      });
    },
  });

  const setStatus = (status: string) => {
    patchMutation.mutate(
      { status },
      {
        onSuccess: () =>
          toast.success(`Marked as ${status}`),
        onError: (err: Error) =>
          toast.error("Update failed", { description: err.message }),
      },
    );
    setStatusMenuOpen(false);
  };

  const setAssignee = (assigneeId: string | null) => {
    patchMutation.mutate(
      { assignedTo: assigneeId },
      {
        onSuccess: () =>
          toast.success(
            assigneeId ? "Assignee updated" : "Cleared assignee",
          ),
        onError: (err: Error) =>
          toast.error("Assign failed", { description: err.message }),
      },
    );
    setAssignMenuOpen(false);
  };

  const snooze = (when: string) => {
    patchMutation.mutate({ status: "snoozed" });
    setSnoozeOpen(false);
    toast.success(`Snoozed until ${when}`, {
      description: "Thread moved to the Snoozed view.",
    });
  };

  // Open assign menu when the parent fires the "A" signal.
  React.useEffect(() => {
    if (openAssignSignal === undefined) return;
    if (!threadId) return;
    setAssignMenuOpen(true);
  }, [openAssignSignal, threadId]);

  // Focus the reply textarea when the parent fires the "R" signal.
  React.useEffect(() => {
    if (focusReplySignal === undefined) return;
    if (!threadId) return;
    // Wait a tick so the textarea is mounted (matched threads only).
    const id = window.setTimeout(() => {
      replyTextareaRef.current?.focus();
      replyTextareaRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [focusReplySignal, threadId]);

  // Scroll timeline to bottom whenever the timeline grows.
  const timelineRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!timelineRef.current) return;
    timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  }, [timeline.length, threadId]);

  if (!threadId) {
    return <ConversationPanelEmpty />;
  }

  const isLoading =
    latestQuery.isLoading || (clientId ? commsQuery.isLoading : false);
  const isError = latestQuery.isError || (clientId ? commsQuery.isError : false);

  const channel = (latest?.channel ?? "system") as ChannelKind;
  const channelLabel = channelMeta[channel]?.label ?? latest?.channel;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={onBack}
            aria-label="Back to thread list"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <span className="shrink-0">
          <ChannelIcon channel={channel} />
        </span>
        <div className="min-w-0 flex-1">
          {latest?.client ? (
            <button
              className="truncate text-sm font-semibold hover:underline"
              onClick={() => latest.client && useNav.getState().openClient(latest.client.id)}
              title="Open client record"
            >
              {latest.client.name}
            </button>
          ) : (
            <span className="truncate text-sm font-semibold text-amber-foreground">
              Unmatched — link to a client
            </span>
          )}
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {unmatched && latest?.fromValue ? latest.fromValue : channelLabel}
            {latest?.subject ? ` · ${latest.subject}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* AI Summarize */}
          {clientId && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-accent/40 text-accent-foreground hover:bg-accent/40"
                onClick={() => setSummaryOpen(true)}
                title="Summarize this thread with AI"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Summarize</span>
              </Button>
              <AiSummaryDialog clientId={clientId} open={summaryOpen} onOpenChange={setSummaryOpen} />
            </>
          )}
          {/* Snooze popover */}
          <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={patchMutation.isPending}
              >
                <Clock className="h-3.5 w-3.5" />
                Snooze
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1.5">
              <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Snooze until
              </p>
              <div className="space-y-0.5">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => snooze(opt.label)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Assign dropdown */}
          <AssignMenu
            open={openAssignSignal !== undefined ? assignMenuOpen : false}
            onOpenChange={setAssignMenuOpen}
            currentAssigneeId={latest?.assignee?.id ?? null}
            onPick={setAssignee}
            loading={patchMutation.isPending}
          />

          {/* Status dropdown */}
          <DropdownMenu open={statusMenuOpen} onOpenChange={setStatusMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={patchMutation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <StatusBadge
                  status={latest?.status ?? "open"}
                  className="border-transparent bg-transparent p-0"
                />
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Set status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={latest?.status ?? "open"}
                onValueChange={setStatus}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-3"
        role="log"
        aria-live="polite"
        aria-label="Conversation timeline"
      >
        {isError ? (
          <ConversationPanelError />
        ) : isLoading ? (
          <ConversationPanelSkeleton />
        ) : (
          <div className="space-y-3">
            {unmatched && latest && (
              <TriageCard
                comm={latest}
                invalidateInbox={invalidateInbox}
              />
            )}
            {timeline.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                No messages yet — start the conversation with a note or portal reply.
              </div>
            ) : (
              timeline.map((c) => <CommCard key={c.id} comm={c} />)
            )}
          </div>
        )}
      </div>

      {/* Composer (only when matched) */}
      {!unmatched && latest && (
        <ReplyComposer
          threadId={threadId}
          threadKey={threadKey}
          clientId={clientId!}
          focusRef={replyTextareaRef}
          invalidateInbox={invalidateInbox}
        />
      )}
    </div>
  );
}

function AssignMenu({
  open,
  onOpenChange,
  currentAssigneeId,
  onPick,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssigneeId: string | null;
  onPick: (id: string | null) => void;
  loading: boolean;
}) {
  const { data, isLoading } = useQueryState<TeamResponse>("team");
  const team = data?.team ?? [];

  const current = team.find((m) => m.id === currentAssigneeId) ?? null;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          disabled={loading}
          aria-label="Assign thread"
        >
          {current ? (
            <Avatar className="h-4 w-4">
              <AvatarFallback className="bg-accent text-[8px] text-accent-foreground">
                {initials(current.fullName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {current ? current.fullName.split(" ")[0] : "Assign"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Assign to
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Loading team…
          </div>
        ) : (
          <DropdownMenuRadioGroup
            value={currentAssigneeId ?? ""}
            onValueChange={(v) => onPick(v)}
          >
            {team.map((m) => (
              <DropdownMenuRadioItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-accent text-[9px] text-accent-foreground">
                      {initials(m.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {m.fullName}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {m.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onPick(null);
          }}
          className="text-muted-foreground"
        >
          <UserMinus className="mr-2 h-3.5 w-3.5" />
          Unassign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConversationPanelEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <InboxIcon className="h-5 w-5" />
      </motion.div>
      <div>
        <p className="text-sm font-medium">Select a thread to view the conversation</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick an item from the list on the left, or use{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            J
          </kbd>{" "}
          /{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            K
          </kbd>{" "}
          to move.
        </p>
      </div>
    </div>
  );
}

function ConversationPanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-3/4" />
      <Skeleton className="ml-auto h-16 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="ml-auto h-20 w-3/4" />
      <Skeleton className="h-16 w-2/3" />
    </div>
  );
}

function ConversationPanelError() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      <AlertCircle className="h-8 w-8 text-rose-foreground/80" />
      <p className="text-sm font-medium">Failed to load conversation</p>
      <p className="text-xs text-muted-foreground">
        Refresh or pick another thread.
      </p>
    </div>
  );
}

// Silence unused-import warning when consumers tweak the export surface.
void CornerUpLeft;
