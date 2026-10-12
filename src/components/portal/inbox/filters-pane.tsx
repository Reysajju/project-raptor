"use client";

import * as React from "react";
import { useNav } from "../nav-store";
import { useQueryState } from "../query-hooks";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Inbox as InboxIcon,
  UserCircle,
  UserMinus,
  HelpCircle,
  Clock,
  CheckCircle2,
  Keyboard,
} from "lucide-react";
import { motion } from "framer-motion";
import type { InboxCounts, InboxFilter } from "./types";

interface FilterDef {
  key: InboxFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey: keyof InboxCounts;
  /** Hint shown under the label. */
  hint: string;
}

const FILTERS: FilterDef[] = [
  {
    key: "all",
    label: "All",
    icon: InboxIcon,
    countKey: "open",
    hint: "Open + snoozed",
  },
  {
    key: "mine",
    label: "Mine",
    icon: UserCircle,
    countKey: "mine",
    hint: "Assigned to you",
  },
  {
    key: "unassigned",
    label: "Unassigned",
    icon: UserMinus,
    countKey: "unassigned",
    hint: "Open, no owner",
  },
  {
    key: "unmatched",
    label: "Unmatched",
    icon: HelpCircle,
    countKey: "unmatched",
    hint: "No linked client",
  },
  {
    key: "snoozed",
    label: "Snoozed",
    icon: Clock,
    countKey: "snoozed",
    hint: "Snoozed for later",
  },
  {
    key: "done",
    label: "Done",
    icon: CheckCircle2,
    countKey: "done",
    hint: "Resolved items",
  },
];

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "J / K", label: "Move up / down" },
  { keys: "E", label: "Mark done" },
  { keys: "A", label: "Assign" },
  { keys: "R", label: "Reply" },
  { keys: "Z", label: "Snooze" },
];

export function FiltersPane() {
  const filter = useNav((s) => s.inboxFilter);
  const setFilter = useNav((s) => s.setInboxFilter);
  const { data, isLoading } = useQueryState<InboxCounts>("inbox-counts");
  const counts = data ?? {
    open: 0,
    unassigned: 0,
    unmatched: 0,
    snoozed: 0,
    done: 0,
    mine: 0,
  };

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div>
        <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Views
        </p>
        <nav
          role="tablist"
          aria-label="Inbox views"
          className="flex flex-col gap-0.5"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const Icon = f.icon;
            const count = counts[f.countKey] ?? 0;
            const isUnmatched = f.key === "unmatched" && count > 0;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                aria-controls="inbox-thread-list"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "group flex min-h-[44px] w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 hover:text-accent-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-accent-foreground" : "text-muted-foreground",
                    isUnmatched && "text-amber-foreground",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-tight">
                    {f.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {f.hint}
                  </span>
                </span>
                <Badge
                  variant={active ? "secondary" : "outline"}
                  className={cn(
                    "h-5 min-w-[24px] justify-center rounded-full px-1.5 text-[10px] font-mono tabular",
                    isLoading && "animate-pulse",
                    isUnmatched &&
                      "border-amber/60 bg-amber/30 text-amber-foreground",
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto rounded-lg border border-border bg-muted/30 p-3 surface-highlight">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Keyboard className="h-3.5 w-3.5" />
          Keyboard shortcuts
        </div>
        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <motion.li
              key={s.label}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] tabular text-foreground">
                {s.keys}
              </kbd>
            </motion.li>
          ))}
        </ul>
        <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
          Active when focus is in the thread list.
        </p>
      </div>
    </div>
  );
}
