"use client";

import * as React from "react";
import { useQueryState } from "../query-hooks";
import { useCurrentUser } from "../user-store";
import { useNav } from "../nav-store";
import { Inbox as InboxIcon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ThreadRow } from "./thread-row";
import type { InboxFilter, InboxResponse, InboxThread } from "./types";

interface ThreadListProps {
  selectedId: string | null;
  onSelect: (thread: InboxThread) => void;
  /**
   * Called when the user presses a thread-level keyboard shortcut while focus
   * is in the list. The argument is the currently highlighted thread or null
   * if there is no selection.
   */
  onShortcut?: (
    key: "down" | "up" | "done" | "snooze" | "assign" | "reply",
    thread: InboxThread | null,
  ) => void;
}

export function ThreadList({ selectedId, onSelect, onShortcut }: ThreadListProps) {
  const filter = useNav((s) => s.inboxFilter) as InboxFilter;
  const user = useCurrentUser((s) => s.user);
  const userId = user?.id ?? "owner";

  const { data, isLoading, isError } = useQueryState<InboxResponse>(
    `inbox:${filter}`,
    `/api/portal/inbox?filter=${filter}&userId=${encodeURIComponent(userId)}`,
  );

  const threads = data?.threads ?? [];
  const rowRefs = React.useRef<Map<string, HTMLButtonElement | null>>(
    new Map(),
  );

  // Auto-select the first thread whenever the list (re)loads with no
  // current selection. This keeps the conversation panel populated.
  React.useEffect(() => {
    if (threads.length === 0) return;
    if (!selectedId || !threads.some((t) => t.id === selectedId)) {
      onSelect(threads[0]);
    }
  }, [data, threads, selectedId, onSelect]);

  const moveSelection = React.useCallback(
    (delta: number) => {
      if (threads.length === 0) return;
      const idx = threads.findIndex((t) => t.id === selectedId);
      const nextIdx = Math.max(
        0,
        Math.min(threads.length - 1, idx < 0 ? 0 : idx + delta),
      );
      const next = threads[nextIdx];
      if (next) {
        onSelect(next);
        const el = rowRefs.current.get(next.id);
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },
    [threads, selectedId, onSelect],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;
      if (isEditable) return;
    }
    if (threads.length === 0) return;

    const current = threads.find((t) => t.id === selectedId) ?? null;

    switch (e.key) {
      case "j":
      case "ArrowDown": {
        e.preventDefault();
        moveSelection(1);
        break;
      }
      case "k":
      case "ArrowUp": {
        e.preventDefault();
        moveSelection(-1);
        break;
      }
      case "e":
        e.preventDefault();
        onShortcut?.("done", current);
        break;
      case "z":
        e.preventDefault();
        onShortcut?.("snooze", current);
        break;
      case "a":
        e.preventDefault();
        onShortcut?.("assign", current);
        break;
      case "r":
        e.preventDefault();
        onShortcut?.("reply", current);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        if (current) onSelect(current);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      id="inbox-thread-list"
      role="listbox"
      aria-label="Inbox threads"
      aria-activedescendant={selectedId ?? undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="h-full min-h-0 outline-none focus-visible:ring-1 focus-visible:ring-ring"
      data-testid="inbox-thread-list"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {filter === "all" ? "All open" : filter}
        </p>
        <span className="font-mono text-[11px] text-muted-foreground tabular">
          {threads.length} {threads.length === 1 ? "thread" : "threads"}
        </span>
      </div>

      {isError ? (
        <ThreadListError />
      ) : isLoading ? (
        <ThreadListSkeleton />
      ) : threads.length === 0 ? (
        <ThreadListEmpty filter={filter} />
      ) : (
        <div
          className="max-h-[calc(100%-2.5rem)] overflow-y-auto scrollbar-thin"
          role="group"
        >
          <AnimatePresence initial={false}>
            {threads.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                active={selectedId === t.id}
                onSelect={onSelect}
                registerRef={(el) => {
                  if (el) rowRefs.current.set(t.id, el);
                  else rowRefs.current.delete(t.id);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ThreadListSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 border-l-2 border-transparent px-3 py-3"
        >
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ThreadListEmpty({ filter }: { filter: InboxFilter }) {
  const labels: Record<InboxFilter, string> = {
    all: "No open or snoozed items",
    mine: "Nothing assigned to you",
    unassigned: "Everything is assigned",
    unmatched: "No unmatched senders — nice work",
    snoozed: "No snoozed threads",
    done: "No resolved items yet",
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <InboxIcon className="h-8 w-8 text-muted-foreground/60" />
      <p className="text-sm font-medium">{labels[filter]}</p>
      <p className="text-xs text-muted-foreground">
        New inbound messages will appear here.
      </p>
    </div>
  );
}

function ThreadListError() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <AlertCircle className="h-8 w-8 text-rose-foreground/80" />
      <p className="text-sm font-medium">Failed to load threads</p>
      <p className="text-xs text-muted-foreground">
        Refresh the page or pick another view.
      </p>
    </div>
  );
}
