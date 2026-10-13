"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusMeta, toneClasses } from "@/lib/format";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0 text-[11px] font-medium uppercase tracking-wide",
        toneClasses[meta.tone],
        className
      )}
    >
      {meta.label}
    </Badge>
  );
}
