"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChannelIcon } from "../common/channel-icon";
import { StatusBadge } from "../common/status-badge";
import { cn } from "@/lib/utils";
import { channelMeta, initials, shortTime, type ChannelKind } from "@/lib/format";
import { motion } from "framer-motion";
import type { InboxThread } from "./types";
import { Link2, AlertCircle } from "lucide-react";

export const THREAD_ROW_ATTR = "data-thread-id";

export function ThreadRow({
  thread,
  active,
  onSelect,
  registerRef,
}: {
  thread: InboxThread;
  active: boolean;
  onSelect: (thread: InboxThread) => void;
  /** Register the row element so the parent can scroll it into view. */
  registerRef?: (el: HTMLButtonElement | null) => void;
}) {
  const unmatched = !thread.clientId;
  const channel = thread.channel as ChannelKind;
  const channelLabel = channelMeta[channel]?.label ?? thread.channel;
  const name = thread.client
    ? thread.client.name
    : thread.fromValue || "Unmatched sender";

  return (
    <motion.button
      ref={registerRef}
      type="button"
      role="option"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      data-thread-id={thread.id}
      onClick={() => onSelect(thread)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative flex w-full min-h-[68px] items-start gap-2.5 border-l-2 border-y border-transparent px-3 py-2.5 text-left transition-colors outline-none focus-visible:bg-accent/40",
        active
          ? "border-l-primary bg-accent/40"
          : "border-l-transparent hover:bg-accent/30",
        unmatched && !active && "border-l-amber/70 hover:bg-amber/10",
        unmatched && active && "border-l-amber",
      )}
    >
      <span className="mt-0.5 shrink-0">
        <ChannelIcon channel={channel} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-medium",
              unmatched && "text-amber-foreground",
            )}
            title={name}
          >
            {name}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular">
            {shortTime(thread.occurredAt)}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
          {thread.subject ? (
            <span className="text-foreground/80">{thread.subject} — </span>
          ) : null}
          {thread.preview}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              unmatched
                ? "bg-amber/30 text-amber-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {unmatched ? (
              <>
                <Link2 className="h-2.5 w-2.5" /> Link to client
              </>
            ) : (
              channelLabel
            )}
          </span>
          <StatusBadge status={thread.status} className="text-[10px] px-1.5" />
        </span>
      </span>
      <span className="mt-0.5 shrink-0 self-start">
        {thread.assignee ? (
          <Avatar className="h-5 w-5">
            <AvatarFallback
              className="bg-accent text-[9px] text-accent-foreground"
              title={`${thread.assignee.fullName} (${thread.assignee.email})`}
            >
              {initials(thread.assignee.fullName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            title="Unassigned"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/60"
          >
            <AlertCircle className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        )}
      </span>
    </motion.button>
  );
}
