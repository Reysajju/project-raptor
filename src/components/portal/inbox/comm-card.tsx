"use client";

import * as React from "react";
import { ChannelIcon } from "../common/channel-icon";
import { cn } from "@/lib/utils";
import {
  channelMeta,
  formatDuration,
  shortTime,
  type ChannelKind,
} from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowDownLeft,
  ArrowUpRight,
  StickyNote,
  Paperclip,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Communication } from "./types";
import { sanitizeHtml } from "./types";

interface CommCardProps {
  comm: Communication;
  /** Compact rendering used inside the conversation timeline. */
  compact?: boolean;
}

export function CommCard({ comm, compact }: CommCardProps) {
  const channel = comm.channel as ChannelKind;
  const meta = channelMeta[channel] ?? channelMeta.system;
  const isOutbound = comm.direction === "outbound";
  const isInternal = comm.direction === "internal" || channel === "note";
  const isInbound = comm.direction === "inbound";

  const fromLabel = comm.fromValue || (comm.client ? comm.client.name : "—");
  const toLabel = comm.toValue || "Internal";

  // Alignment per direction.
  const align = isOutbound
    ? "ml-auto"
    : isInternal
      ? "mx-auto"
      : "mr-auto";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex w-full", isOutbound ? "justify-end" : isInternal ? "justify-center" : "justify-start")}
    >
      <div
        className={cn(
          "flex max-w-[92%] flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm surface-highlight sm:max-w-[78%]",
          align,
          isOutbound
            ? "border-accent/40 bg-accent/20"
            : isInternal
              ? "border-dashed border-border bg-muted/40"
              : "border-border bg-card",
        )}
      >
        {/* Header row */}
        <div className="flex items-center gap-2">
          <ChannelIcon channel={channel} className="h-6 w-6" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs">
              <DirectionIcon
                outbound={isOutbound}
                internal={isInternal}
                className={meta.color}
              />
              <span className="font-medium">
                {isOutbound
                  ? "Outbound"
                  : isInternal
                    ? "Internal"
                    : "Inbound"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className={meta.color}>{meta.label}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              <span className="text-foreground/80">{fromLabel}</span>
              {isInbound || isOutbound ? (
                <>
                  {" "}
                  <span aria-hidden>→</span>{" "}
                  <span>{toLabel}</span>
                </>
              ) : null}
            </div>
          </div>
          <time
            dateTime={comm.occurredAt}
            className="shrink-0 font-mono text-[11px] text-muted-foreground tabular"
          >
            {shortTime(comm.occurredAt)}
          </time>
        </div>

        {/* Subject (if any) */}
        {comm.subject && (
          <p className="text-sm font-medium">{comm.subject}</p>
        )}

        {/* Body */}
        <CommBody comm={comm} compact={compact} />

        {/* Footer: attachments + visibleToClient */}
        <CommFooter comm={comm} />
      </div>
    </motion.div>
  );
}

function DirectionIcon({
  outbound,
  internal,
  className,
}: {
  outbound: boolean;
  internal: boolean;
  className?: string;
}) {
  if (internal) return <StickyNote className={cn("h-3 w-3", className)} />;
  return outbound ? (
    <ArrowUpRight className={cn("h-3 w-3", className)} />
  ) : (
    <ArrowDownLeft className={cn("h-3 w-3", className)} />
  );
}

function CommBody({ comm, compact }: { comm: Communication; compact?: boolean }) {
  const channel = comm.channel as ChannelKind;
  if (channel === "call") return <CallBody comm={comm} compact={compact} />;
  if (channel === "email") return <EmailBody comm={comm} />;
  return <PlainBody comm={comm} />;
}

function PlainBody({ comm }: { comm: Communication }) {
  if (!comm.bodyText) return null;
  return (
    <div className="whitespace-pre-wrap break-words text-sm text-foreground/90">
      {comm.bodyText}
    </div>
  );
}

function EmailBody({ comm }: { comm: Communication }) {
  const html = React.useMemo(
    () => sanitizeHtml(comm.bodyHtmlSanitized || comm.bodyText),
    [comm.bodyHtmlSanitized, comm.bodyText],
  );
  const fallback = !html;
  return (
    <div
      className="email-body prose prose-sm max-w-none break-words text-foreground/90"
      // The HTML is sanitized client-side via DOMParser + attribute stripping.
      dangerouslySetInnerHTML={fallback ? undefined : { __html: html }}
    >
      {fallback ? comm.bodyText : null}
    </div>
  );
}

function CallBody({ comm, compact }: { comm: Communication; compact?: boolean }) {
  const summary = comm.summary || comm.bodyText;
  const tabs = (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="h-8">
        <TabsTrigger value="summary" className="text-xs">
          Summary
        </TabsTrigger>
        <TabsTrigger value="transcript" className="text-xs">
          Transcript
        </TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-2 text-xs">
        <p className="whitespace-pre-wrap break-words text-foreground/90">
          {summary || "No summary recorded."}
        </p>
      </TabsContent>
      <TabsContent value="transcript" className="mt-2 text-xs">
        {comm.transcript ? (
          <p className="whitespace-pre-wrap break-words text-muted-foreground">
            {comm.transcript}
          </p>
        ) : (
          <p className="text-muted-foreground">
            No transcript available for this call.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <Phone className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono tabular text-foreground">
          {formatDuration(comm.durationSec)}
        </span>
        {comm.audioUrl && (
          <a
            href={comm.audioUrl}
            className="text-xs text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Recording
          </a>
        )}
      </div>
      {compact ? (
        <p className="whitespace-pre-wrap break-words text-xs text-foreground/90">
          {summary || "No summary recorded."}
        </p>
      ) : (
        tabs
      )}
    </div>
  );
}

function CommFooter({ comm }: { comm: Communication }) {
  const visible = comm.visibleToClient;
  const attachCount = comm.attachments?.length ?? 0;
  if (!visible && attachCount === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border/60 pt-1.5 text-[10px] text-muted-foreground">
      {visible && (
        <span className="rounded-full bg-emerald/20 px-1.5 py-0.5 text-emerald-foreground">
          Visible to client
        </span>
      )}
      {attachCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          {attachCount} {attachCount === 1 ? "attachment" : "attachments"}
        </span>
      )}
    </div>
  );
}
