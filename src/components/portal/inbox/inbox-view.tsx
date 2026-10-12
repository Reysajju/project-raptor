"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiPatch } from "../query-hooks";
import { useNav } from "../nav-store";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { FiltersPane } from "./filters-pane";
import { ThreadList } from "./thread-list";
import { ConversationPanel } from "./conversation-panel";
import type { InboxFilter } from "./types";
import { toast } from "sonner";

const INBOX_FILTER_KEYS: InboxFilter[] = [
  "all",
  "mine",
  "unassigned",
  "unmatched",
  "snoozed",
  "done",
];

/**
 * Shared inbox: three-pane layout (filters | thread list | conversation).
 *
 * - Desktop (md+): a horizontal ResizablePanelGroup with three panels.
 * - Mobile (<md): a single-pane switcher driven by local state.
 *
 * Keyboard shortcuts (J/K/E/Z/A/R) are handled inside the ThreadList when it
 * has focus and bubble up here via the onShortcut callback for actions that
 * need to touch the conversation panel (assign / reply) or the API (done /
 * snooze).
 */
export function InboxView() {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    null,
  );
  const [mobilePane, setMobilePane] = React.useState<"list" | "conversation">(
    "list",
  );
  const [assignSignal, setAssignSignal] = React.useState(0);
  const [replySignal, setReplySignal] = React.useState(0);

  const invalidateInbox = React.useCallback(() => {
    for (const f of INBOX_FILTER_KEYS) {
      void queryClient.invalidateQueries({ queryKey: [`inbox:${f}`] });
    }
    void queryClient.invalidateQueries({ queryKey: ["inbox-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["inbox-thread-latest"] });
    void queryClient.invalidateQueries({ queryKey: ["inbox-thread-comms"] });
  }, [queryClient]);

  const onSelectThread = React.useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setMobilePane("conversation");
  }, []);

  const onShortcut = React.useCallback(
    async (
      action: "done" | "snooze" | "assign" | "reply" | "down" | "up",
      threadId: string | null,
    ) => {
      if (!threadId) return;
      if (action === "assign") {
        setSelectedThreadId(threadId);
        setMobilePane("conversation");
        setAssignSignal((n) => n + 1);
        return;
      }
      if (action === "reply") {
        setSelectedThreadId(threadId);
        setMobilePane("conversation");
        setReplySignal((n) => n + 1);
        return;
      }
      if (action === "done" || action === "snooze") {
        try {
          await apiPatch(
            `/api/portal/communications/${threadId}`,
            { status: action === "done" ? "done" : "snoozed" },
          );
          invalidateInbox();
          toast.success(
            action === "done" ? "Marked as done" : "Snoozed",
            action === "snoozed"
              ? { description: "Thread moved to the Snoozed view." }
              : undefined,
          );
        } catch (err) {
          toast.error("Update failed", {
            description: err instanceof Error ? err.message : String(err),
          });
        }
      }
    },
    [invalidateInbox],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Page heading */}
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Shared inbox
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Triage inbound messages, assign owners, and reply without leaving
            the thread.
          </p>
        </div>
      </header>

      {/* Desktop: three-pane resizable layout */}
      <div
        className="hidden overflow-hidden rounded-lg border border-border bg-card/40 md:block"
        style={{ height: "calc(100vh - 11rem)" }}
      >
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={14} maxSize={22}>
            <aside className="h-full overflow-y-auto scrollbar-thin border-r border-border bg-card/40">
              <FiltersPane />
            </aside>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={32} minSize={22} maxSize={48}>
            <section className="h-full overflow-hidden border-r border-border">
              <ThreadList
                selectedId={selectedThreadId}
                onSelect={(t) => {
                  onSelectThread(t.id);
                  // Bump highlight on the parent so the next keyboard
                  // navigation starts from this thread.
                  setSelectedThreadId(t.id);
                }}
                onShortcut={(key, thread) =>
                  onShortcut(
                    key as "done" | "snooze" | "assign" | "reply" | "down" | "up",
                    thread?.id ?? null,
                  )
                }
              />
            </section>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={32}>
            <section className="h-full overflow-hidden">
              <ConversationPanel
                threadId={selectedThreadId}
                onBack={undefined}
                openAssignSignal={assignSignal}
                focusReplySignal={replySignal}
                invalidateInbox={invalidateInbox}
              />
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: single-pane switcher */}
      <div className="md:hidden">
        {mobilePane === "list" ? (
          <div
            className="overflow-hidden rounded-lg border border-border bg-card/40"
            style={{ height: "calc(100vh - 12rem)" }}
          >
            <MobileFilterBar />
            <div className="h-[calc(100%-3rem)]">
              <ThreadList
                selectedId={selectedThreadId}
                onSelect={(t) => onSelectThread(t.id)}
                onShortcut={(key, thread) =>
                  onShortcut(
                    key as "done" | "snooze" | "assign" | "reply" | "down" | "up",
                    thread?.id ?? null,
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-lg border border-border bg-card/40"
            style={{ height: "calc(100vh - 12rem)" }}
          >
            <ConversationPanel
              threadId={selectedThreadId}
              onBack={() => setMobilePane("list")}
              openAssignSignal={assignSignal}
              focusReplySignal={replySignal}
              invalidateInbox={invalidateInbox}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact horizontal filter bar shown at the top of the mobile thread list.
 * Mirrors the desktop FiltersPane but in a chip row.
 */
function MobileFilterBar() {
  const filter = useNav((s) => s.inboxFilter);
  const setFilter = useNav((s) => s.setInboxFilter);
  const filters: InboxFilter[] = [
    "all",
    "mine",
    "unassigned",
    "unmatched",
    "snoozed",
    "done",
  ];
  return (
    <div className="flex h-12 items-center gap-1 overflow-x-auto border-b border-border px-2 scrollbar-thin">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={cn(
            "h-8 shrink-0 rounded-full px-3 text-xs font-medium capitalize transition-colors",
            filter === f
              ? "bg-accent text-accent-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-accent/40",
            f === "unmatched" && filter !== f && "text-amber-foreground",
          )}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
