"use client";

import * as React from "react";
import { Heart, TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "@/components/portal/query-hooks";

interface HealthFactor {
  label: string;
  impact: number;
  detail: string;
}

interface HealthResponse {
  score: number;
  sentiment: string;
  sentimentTone: "emerald" | "amber" | "rose";
  factors: HealthFactor[];
  trend?: "up" | "down" | "stable";
  trendLabel?: string;
  trendDelta?: number;
  thisWeekComms?: number;
  lastWeekComms?: number;
}

const TONE_STYLES: Record<string, { ring: string; text: string; bg: string; label: string }> = {
  emerald: {
    ring: "text-emerald-foreground",
    text: "text-emerald-foreground",
    bg: "bg-emerald",
    label: "Healthy",
  },
  amber: {
    ring: "text-amber-foreground",
    text: "text-amber-foreground",
    bg: "bg-amber",
    label: "Needs attention",
  },
  rose: {
    ring: "text-rose-foreground",
    text: "text-rose-foreground",
    bg: "bg-rose",
    label: "At risk",
  },
};

const SENTIMENT_ICON = {
  healthy: Heart,
  "needs attention": TrendingUp,
  "at risk": AlertTriangle,
  critical: AlertTriangle,
} as const;

export function HealthScoreWidget({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQueryState<HealthResponse>(
    `client-${clientId}-health`,
    `/api/portal/clients/${clientId}/health`
  );

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 surface-highlight">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-20 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  const tone = TONE_STYLES[data.sentimentTone] ?? TONE_STYLES.amber;
  const Icon = SENTIMENT_ICON[data.sentiment as keyof typeof SENTIMENT_ICON] ?? Activity;

  return (
    <div className="rounded-lg border border-border bg-card p-4 surface-highlight">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Heart className="h-3 w-3" />
          Health score
        </p>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", tone.bg, tone.text)}>
          <Icon className="h-2.5 w-2.5" />
          {tone.label}
        </span>
      </div>

      {/* Score ring + trend */}
      <div className="mt-3 flex items-center gap-4">
        <ScoreRing score={data.score} tone={tone.text} />
        <div className="flex-1 space-y-1.5">
          {data.trend && (
            <div className="mb-1.5 flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
              <TrendIcon trend={data.trend} />
              <span className="text-[10px] font-medium text-muted-foreground">{data.trendLabel}</span>
              <span className="ml-auto font-mono text-[10px] tabular text-muted-foreground">
                {data.thisWeekComms ?? 0}w / {data.lastWeekComms ?? 0}w
              </span>
            </div>
          )}
          {data.factors.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-muted-foreground">{f.label}</span>
              <span className="shrink-0 font-mono tabular text-foreground">
                {f.impact}
                <span className="text-muted-foreground/60">/{f.label === "Communication recency" ? 30 : f.label === "Open items" ? 20 : f.label === "Pending approvals" ? 15 : f.label === "Active projects" ? 20 : 15}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Factor details */}
      <div className="mt-3 space-y-1 border-t border-border pt-2">
        {data.factors.map((f) => (
          <p key={f.label} className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{f.label}</span>
            <span className="font-medium">{f.detail}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ScoreRing({ score, tone }: { score: number; tone: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", tone)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-mono text-lg font-semibold tabular", tone)}>{score}</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") {
    return <TrendingUp className="h-3 w-3 text-emerald-foreground" />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-3 w-3 text-rose-foreground" />;
  }
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}
