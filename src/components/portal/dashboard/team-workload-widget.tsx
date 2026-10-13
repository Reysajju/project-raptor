"use client";

import * as React from "react";
import { Users, Inbox, KanbanSquare, AlertTriangle, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState } from "@/components/portal/query-hooks";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  ownedClients: number;
  openComms: number;
  activeTasks: number;
  overdueTasks: number;
  pendingApprovals: number;
}

interface TeamWorkloadResponse {
  team: TeamMember[];
}

export function TeamWorkloadWidget() {
  const { data, isLoading } = useQueryState<TeamWorkloadResponse>(
    "dashboard-team-workload",
    "/api/portal/dashboard/team-workload"
  );

  if (isLoading || !data) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Team workload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const { team } = data;
  const maxWorkload = Math.max(1, ...team.map((m) => m.openComms + m.activeTasks));

  return (
    <Card className="surface-highlight">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Team workload
            </CardTitle>
            <CardDescription className="text-xs">
              {team.length} member{team.length === 1 ? "" : "s"} · sorted by active load
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {team.map((m) => {
          const totalLoad = m.openComms + m.activeTasks;
          const loadPct = Math.min(100, Math.round((totalLoad / maxWorkload) * 100));
          const isOverloaded = m.overdueTasks > 0 || m.openComms > 5;
          return (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border bg-card p-3 transition-all surface-highlight",
                isOverloaded ? "border-amber/40" : "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={cn("text-xs font-semibold", m.role === "owner" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    {initials(m.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{m.fullName}</p>
                    {m.role === "owner" && (
                      <Crown className="h-3 w-3 shrink-0 text-amber-foreground" />
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">{m.email}</p>
                </div>
              </div>

              {/* Load bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isOverloaded ? "bg-amber-foreground" : "bg-primary"
                    )}
                    style={{ width: `${loadPct}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] tabular text-muted-foreground">
                  {totalLoad} active
                </span>
              </div>

              {/* Stat chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatChip
                  icon={Users}
                  label="clients"
                  value={m.ownedClients}
                  tone="default"
                />
                <StatChip
                  icon={Inbox}
                  label="open"
                  value={m.openComms}
                  tone={m.openComms > 5 ? "amber" : "default"}
                />
                <StatChip
                  icon={KanbanSquare}
                  label="tasks"
                  value={m.activeTasks}
                  tone="default"
                />
                {m.overdueTasks > 0 && (
                  <StatChip
                    icon={AlertTriangle}
                    label="overdue"
                    value={m.overdueTasks}
                    tone="rose"
                  />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "default" | "amber" | "rose";
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose/20 text-rose-foreground"
      : tone === "amber"
      ? "bg-amber/20 text-amber-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]", toneClass)}>
      <Icon className="h-2.5 w-2.5" />
      <span className="font-mono tabular">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
