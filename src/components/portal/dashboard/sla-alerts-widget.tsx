"use client";

import * as React from "react";
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryState } from "@/components/portal/query-hooks";
import { useNav } from "@/components/portal/nav-store";
import { cn } from "@/lib/utils";

interface SlaItem {
  clientId: string;
  clientName: string;
  company: string | null;
  accentColor: string;
  ownerName: string | null;
  ageHours: number;
  channel: string;
  subject: string;
}

interface SlaResponse {
  breaches: SlaItem[];
  atRisk: SlaItem[];
  summary: {
    breachCount: number;
    atRiskCount: number;
    slaTargetHours: number;
    slaBreachHours: number;
  };
}

export function SlaAlertsWidget() {
  const { data, isLoading } = useQueryState<SlaResponse>(
    "dashboard-sla",
    "/api/portal/dashboard/sla"
  );
  const nav = useNav();

  if (isLoading) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">SLA status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { breaches, atRisk, summary } = data;
  const totalIssues = breaches.length + atRisk.length;

  if (totalIssues === 0) {
    return (
      <Card className="surface-highlight border-emerald/30">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald text-emerald-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-emerald-foreground">SLA healthy</p>
            <p className="text-xs text-muted-foreground">
              All inbound messages responded to within {summary.slaTargetHours}h target.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("surface-highlight", breaches.length > 0 && "border-rose/40")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", breaches.length > 0 ? "bg-rose/20 text-rose-foreground" : "bg-amber/20 text-amber-foreground")}>
                {breaches.length > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              </span>
              SLA status
            </CardTitle>
            <CardDescription className="text-xs">
              {breaches.length} breached · {atRisk.length} at risk · target {summary.slaTargetHours}h
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Breaches */}
        {breaches.slice(0, 3).map((b) => (
          <SlaRow key={b.clientId} item={b} tone="breach" onClick={() => nav.openClient(b.clientId)} />
        ))}
        {/* At risk */}
        {atRisk.slice(0, 2).map((r) => (
          <SlaRow key={r.clientId} item={r} tone="atRisk" onClick={() => nav.openClient(r.clientId)} />
        ))}
        {totalIssues > 5 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => nav.setView("inbox")}>
            +{totalIssues - 5} more · View inbox
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SlaRow({
  item,
  tone,
  onClick,
}: {
  item: SlaItem;
  tone: "breach" | "atRisk";
  onClick: () => void;
}) {
  const isBreach = tone === "breach";
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-2.5 rounded-md border bg-card p-2.5 text-left transition-all hover:shadow-sm hover:-translate-y-0.5"
      style={{ borderColor: isBreach ? "var(--rose-foreground)" : "var(--amber-foreground)", borderWidth: 1, opacity: 0.9 }}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          isBreach ? "bg-rose/20 text-rose-foreground" : "bg-amber/20 text-amber-foreground"
        )}
      >
        {isBreach ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs font-medium">{item.clientName}</p>
          <span className={cn("shrink-0 font-mono text-[11px] tabular", isBreach ? "text-rose-foreground" : "text-amber-foreground")}>
            {item.ageHours}h
          </span>
        </div>
        <p className="truncate text-[10px] text-muted-foreground capitalize">
          {item.channel} · {item.subject || "No subject"}
        </p>
      </div>
      <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
