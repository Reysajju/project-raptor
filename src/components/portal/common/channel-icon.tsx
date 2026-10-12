"use client";

import * as React from "react";
import { Mail, MessageSquare, Phone, Globe, StickyNote, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelKind } from "@/lib/format";
import { channelMeta } from "@/lib/format";

const iconFor: Record<ChannelKind, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  portal: Globe,
  note: StickyNote,
  system: Zap,
};

export function ChannelIcon({
  channel,
  className,
}: {
  channel: ChannelKind;
  className?: string;
}) {
  const Icon = iconFor[channel] ?? Zap;
  const meta = channelMeta[channel];
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50",
        className
      )}
      title={meta.label}
      aria-label={meta.label}
    >
      <Icon className={cn("h-3.5 w-3.5", meta.color)} />
    </span>
  );
}
