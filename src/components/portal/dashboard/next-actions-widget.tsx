"use client";

import * as React from "react";
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Plug,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueryState } from "@/components/portal/query-hooks";
import { useNav } from "@/components/portal/nav-store";
import { cn } from "@/lib/utils";

interface NextAction {
  id: string;
  priority: "urgent" | "high" | "medium";
  title: string;
  detail: string;
  cta: string;
  target: { view: string; clientId?: string };
  icon: string;
}

interface NextActionsResponse {
  actions: NextAction[];
}

const ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  check: CheckCircle2,
  alert: AlertTriangle,
  plug: Plug,
};

const PRIORITY_STYLES: Record<string, { ring: string; label: string; tone: string }> = {
  urgent: { ring: "ring-rose/40", label: "Urgent", tone: "text-rose-foreground bg-rose/20" },
  high: { ring: "ring-amber/40", label: "High", tone: "text-amber-foreground bg-amber/20" },
  medium: { ring: "ring-sky/40", label: "Medium", tone: "text-sky-foreground bg-sky/20" },
};

export function NextActionsWidget() {
  const { data, isLoading } = useQueryState<NextActionsResponse>("next-actions", "/api/portal/ai/next-actions");
  const nav = useNav();

  if (isLoading) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Suggested next actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted/50" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const actions = data?.actions ?? [];

  if (actions.length === 0) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald/20 text-emerald-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            Suggested next actions
          </CardTitle>
          <CardDescription className="text-xs">
            You're all caught up. Nothing urgent right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-md border border-emerald/30 bg-emerald/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-foreground" />
            <p className="text-xs text-muted-foreground">
              No stale threads, pending approvals, overdue tasks, or expiring integrations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-highlight">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          Suggested next actions
        </CardTitle>
        <CardDescription className="text-xs">
          {actions.length} action{actions.length === 1 ? "" : "s"} to take, sorted by priority.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((a) => {
          const Icon = ICONS[a.icon] ?? Inbox;
          const style = PRIORITY_STYLES[a.priority];
          return (
            <button
              key={a.id}
              onClick={() => {
                if (a.target.clientId) nav.openClient(a.target.clientId);
                else if (a.target.view) nav.setView(a.target.view as never);
              }}
              className={cn(
                "group flex w-full items-start gap-3 rounded-md border bg-card p-2.5 text-left transition-all hover:shadow-sm hover:-translate-y-0.5 ring-1",
                style.ring
              )}
            >
              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md", style.tone)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0 text-[9px] uppercase", style.tone)}
                  >
                    {style.label}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {a.detail}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
                  {a.cta}
                  <ArrowRight className="h-3 w-3" />
                </p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
