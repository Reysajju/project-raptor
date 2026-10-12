"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "../common/status-badge";
import { cn } from "@/lib/utils";

import {
  type Project,
  type ProjectMilestone,
  accentDot,
  dueToneClass,
  dueDays,
} from "./types";

interface MilestonesViewProps {
  projects: Project[];
  onProjectClick: (p: Project) => void;
}

export function MilestonesView({
  projects,
  onProjectClick,
}: MilestonesViewProps) {
  const reduced = useReducedMotion();

  // Compute axis bounds from all milestone + project due dates.
  const { min, max, totalDays } = React.useMemo(() => {
    const dates: number[] = [];
    for (const p of projects) {
      if (p.dueDate) dates.push(new Date(p.dueDate).getTime());
      for (const m of p.milestones) {
        if (m.dueDate) dates.push(new Date(m.dueDate).getTime());
      }
    }
    if (dates.length === 0) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      return {
        min: now - 2 * dayMs,
        max: now + 14 * dayMs,
        totalDays: 16,
      };
    }
    const mn = Math.min(...dates);
    const mx = Math.max(...dates);
    const span = Math.max(mx - mn, 1);
    return {
      min: mn,
      max: mx,
      totalDays: Math.ceil(span / (24 * 60 * 60 * 1000)),
    };
  }, [projects]);

  // Pure helper — kept outside the closure so React Hook deps stay simple.
  const pctFor = React.useCallback(
    (ts: number): number => {
      if (max === min) return 50;
      const clamped = Math.max(min, Math.min(max, ts));
      return ((clamped - min) / (max - min)) * 100;
    },
    [min, max]
  );

  // Today marker position on the axis.
  const todayPct = pctFor(Date.now());

  // Tick marks: weekly-ish spacing.
  const ticks = React.useMemo(() => {
    const out: { label: string; pct: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const step = totalDays <= 14 ? 1 : totalDays <= 30 ? 3 : 7;
    for (let d = 0; d <= totalDays; d += step) {
      const ts = min + d * dayMs;
      out.push({ label: format(new Date(ts), "d MMM"), pct: pctFor(ts) });
    }
    return out;
  }, [min, totalDays, pctFor]);

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">No projects to plot</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Create a project with milestones to see a timeline view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Axis */}
      <div className="relative ml-[180px] h-6 select-none border-b border-border text-[10px] text-muted-foreground">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
        {todayPct >= 0 && todayPct <= 100 && (
          <span
            className="absolute top-0 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0 text-[9px] font-medium text-primary-foreground"
            style={{ left: `${todayPct}%` }}
          >
            Today
          </span>
        )}
      </div>

      <div className="space-y-2">
        {projects.map((p, i) => {
          const projPct = p.dueDate ? pctFor(new Date(p.dueDate).getTime()) : null;
          return (
            <motion.div
              key={p.id}
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
              className="flex items-stretch gap-2"
            >
              {/* Track label */}
              <button
                onClick={() => onProjectClick(p)}
                className="flex w-[180px] shrink-0 items-center gap-2 rounded-md border border-border bg-card p-2 surface-highlight text-left transition-colors hover:border-primary/30"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: accentDot(p.client?.accentColor) }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-tight">
                    {p.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {p.client?.name}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </button>

              {/* Timeline */}
              <div className="relative flex-1 rounded-md border border-border bg-card/50 p-2">
                {/* Track line */}
                <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-border" />

                {/* Today marker */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <span
                    className="absolute top-0 bottom-0 w-px bg-primary/40"
                    style={{ left: `${todayPct}%` }}
                    aria-hidden
                  />
                )}

                {/* Project due marker */}
                {projPct !== null && (
                  <span
                    className="absolute top-1/2 z-10 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${projPct}%` }}
                    title={`Project due ${p.dueDate ? format(new Date(p.dueDate), "d MMM yyyy") : ""}`}
                  >
                    <Calendar
                      className={cn(
                        "h-3.5 w-3.5",
                        dueToneClass[dueToneKey(dueDays(p.dueDate))]
                      )}
                    />
                  </span>
                )}

                {/* Milestones */}
                <div className="relative h-8">
                  {p.milestones.map((m, idx) => (
                    <MilestoneMarker
                      key={m.id}
                      milestone={m}
                      idx={idx}
                      pctFor={pctFor}
                    />
                  ))}
                  {p.milestones.length === 0 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      No milestones
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneMarker({
  milestone,
  idx,
  pctFor,
}: {
  milestone: ProjectMilestone;
  idx: number;
  pctFor: (ts: number) => number;
}) {
  const days = dueDays(milestone.dueDate);
  const tone = dueToneKey(days);
  const pct = milestone.dueDate
    ? pctFor(new Date(milestone.dueDate).getTime())
    : 50;

  // Avoid markers falling off-edge by clamping inside [4, 96].
  const clampedPct = Math.max(4, Math.min(96, pct));

  const dueLabel = milestone.dueDate
    ? ` · ${format(new Date(milestone.dueDate), "d MMM")}`
    : "";
  const urgencyLabel =
    typeof days === "number" && days < 0
      ? ` · ${Math.abs(days)}d overdue`
      : typeof days === "number" && days <= 3
        ? ` · in ${days}d`
        : "";
  const title = `${milestone.title}${dueLabel}${urgencyLabel}`;

  return (
    <div
      className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${clampedPct}%` }}
      title={title}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span
          className={cn(
            "inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-medium",
            milestone.completed
              ? "bg-emerald text-emerald-foreground"
              : tone === "overdue"
                ? "bg-rose text-rose-foreground"
                : tone === "soon"
                  ? "bg-amber text-amber-foreground"
                  : "bg-muted text-muted-foreground"
          )}
        >
          {milestone.completed ? (
            <CheckCircle2 className="h-2.5 w-2.5" />
          ) : tone === "overdue" ? (
            <AlertTriangle className="h-2.5 w-2.5" />
          ) : (
            <Circle className="h-2.5 w-2.5" />
          )}
        </span>
        <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">
          {milestone.title}
        </span>
        <Badge
          variant="outline"
          className="hidden rounded-full bg-background px-1 py-0 text-[8px] tabular sm:inline-flex"
        >
          {idx + 1}
        </Badge>
      </div>
    </div>
  );
}

function dueToneKey(days: number | null): "overdue" | "soon" | "normal" {
  if (days === null) return "normal";
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "normal";
}
