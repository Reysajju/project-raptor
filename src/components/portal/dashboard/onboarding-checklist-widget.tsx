"use client";

import * as React from "react";
import {
  CheckCircle2,
  Circle,
  PartyPopper,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useQueryState } from "@/components/portal/query-hooks";
import { useNav, type ViewKey } from "@/components/portal/nav-store";
import { cn } from "@/lib/utils";

interface OnboardingItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  href: string;
}

interface OnboardingResponse {
  items: OnboardingItem[];
  doneCount: number;
  totalCount: number;
  pct: number;
  isComplete: boolean;
}

export function OnboardingChecklistWidget() {
  const { data, isLoading } = useQueryState<OnboardingResponse>(
    "dashboard-onboarding",
    "/api/portal/dashboard/onboarding"
  );
  const nav = useNav();

  if (isLoading || !data) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Getting started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse rounded bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  // Hide the widget when onboarding is complete
  if (data.isComplete) {
    return (
      <Card className="surface-highlight border-emerald/30">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald text-emerald-foreground">
            <PartyPopper className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-foreground">All set! 🎉</p>
            <p className="text-xs text-muted-foreground">
              You've completed all onboarding steps. Your workspace is ready.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextItem = data.items.find((i) => !i.done);

  return (
    <Card className="surface-highlight">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Getting started</CardTitle>
            <CardDescription className="text-xs">
              {data.doneCount} of {data.totalCount} steps complete
            </CardDescription>
          </div>
          <span className="font-mono text-lg font-semibold tabular text-primary">{data.pct}%</span>
        </div>
        <Progress value={data.pct} className="mt-1.5 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-1">
        {data.items.map((item) => (
          <button
            key={item.id}
            onClick={() => nav.setView(item.href as ViewKey)}
            disabled={item.done}
            className={cn(
              "group flex w-full items-start gap-2.5 rounded-md p-2 text-left transition-colors",
              item.done ? "opacity-50" : "hover:bg-muted/50"
            )}
          >
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-foreground" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-medium", item.done && "line-through")}>
                {item.label}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.detail}</p>
            </div>
            {!item.done && (
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </button>
        ))}
        {nextItem && (
          <Button
            size="sm"
            className="mt-2 w-full gap-1.5"
            onClick={() => nav.setView(nextItem.href as ViewKey)}
          >
            Next: {nextItem.label}
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
