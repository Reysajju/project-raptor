"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryState } from "@/components/portal/query-hooks";
import { useDashboardStore } from "./dashboard-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string;
  count: number;
  channels: Record<string, number>;
}

interface HeatmapResponse {
  days: HeatmapDay[];
  maxCount: number;
  totalComms: number;
  activeDays: number;
  spanDays: number;
}

export function ActivityHeatmapWidget() {
  const { data, isLoading } = useQueryState<HeatmapResponse>(
    "dashboard-heatmap",
    "/api/portal/dashboard/heatmap"
  );
  const selectedDate = useDashboardStore((s) => s.selectedDate);
  const toggleDate = useDashboardStore((s) => s.toggleDate);
  const setSelectedDate = useDashboardStore((s) => s.setSelectedDate);

  if (isLoading || !data) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Activity heatmap</CardTitle>
          <CardDescription className="text-xs">Last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  const { days, maxCount, totalComms, activeDays } = data;

  // Group into weeks (columns of 7). 90 days ≈ 13 weeks.
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const selectedDay = selectedDate ? days.find((d) => d.date === selectedDate) : null;

  const intensity = (count: number) => {
    if (count === 0) return "bg-muted/40";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-primary/20";
    if (ratio < 0.5) return "bg-primary/40";
    if (ratio < 0.75) return "bg-primary/60";
    return "bg-primary/90";
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Card className="surface-highlight">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Activity heatmap</CardTitle>
            <CardDescription className="text-xs">
              {totalComms} communications · {activeDays} active days in the last 90
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            <span className="h-2.5 w-2.5 rounded-sm bg-muted/40" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/20" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/40" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/90" />
            <span>More</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* Month labels row */}
            <div className="flex gap-[3px] pl-0 text-[10px] text-muted-foreground">
              {weeks.map((week, i) => {
                const firstDay = week[0];
                if (!firstDay) return null;
                const date = new Date(firstDay.date);
                const isFirstOfMonth = date.getDate() <= 7;
                if (isFirstOfMonth && i > 0) {
                  return <span key={i} className="w-3 text-[9px]">{monthLabels[date.getMonth()].slice(0, 3)}</span>;
                }
                return <span key={i} className="w-3" />;
              })}
            </div>
            {/* Heatmap grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (day.count > 0) {
                              toggleDate(day.date);
                            }
                          }}
                          className={cn(
                            "h-3 w-3 rounded-sm transition-all hover:ring-1 hover:ring-primary/40",
                            intensity(day.count),
                            selectedDate === day.date && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                            day.count === 0 && "cursor-default"
                          )}
                          aria-label={`${day.date}: ${day.count} communications`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div>
                          <p className="font-medium">{new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                          {day.count > 0 ? (
                            <>
                              <p className="text-muted-foreground">{day.count} communication{day.count === 1 ? "" : "s"}</p>
                              {Object.entries(day.channels).map(([ch, n]) => (
                                <p key={ch} className="text-[10px] text-muted-foreground capitalize">{n} {ch}</p>
                              ))}
                            </>
                          ) : (
                            <p className="text-muted-foreground">No activity</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium tabular">
                {new Date(selectedDay.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {selectedDay.count} communication{selectedDay.count === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1.5">
                {Object.entries(selectedDay.channels).map(([ch, n]) => (
                  <span key={ch} className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] capitalize">
                    {n} {ch}
                  </span>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setSelectedDate(null)}
            >
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
