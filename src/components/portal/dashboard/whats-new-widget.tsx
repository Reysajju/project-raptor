"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersistentState } from "@/lib/use-persistent-state";
import { cn } from "@/lib/utils";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.8",
    date: "2026-10-13",
    title: "Team workload & tags management",
    items: [
      "Team workload widget on the dashboard — per-member client/task/overdue counts with load bars",
      "Client tags management panel — rename, merge, and delete tags across all clients",
      "SLA tracking now uses business-hours-aware age calculation",
      "Sidebar active indicator animates between views",
    ],
  },
  {
    version: "1.7",
    date: "2026-10-13",
    title: "Relationship timeline & SLA alerts",
    items: [
      "Relationship timeline — horizontal scroll of client milestones",
      "SLA breach alerts — per-client response-time tracking with breach/at-risk states",
      "Interactive heatmap — click a day to filter the activity feed",
      "Focus mode hides breadcrumbs for distraction-free work",
    ],
  },
  {
    version: "1.6",
    date: "2026-10-13",
    title: "Health score & onboarding",
    items: [
      "Client health score with circular ring + trend indicator",
      "Onboarding checklist with progress tracking (auto-hides when complete)",
      "Per-client accent color theming on header, timeline bubbles, and call cards",
      "Bulk client actions — export, tag, assign, archive",
    ],
  },
  {
    version: "1.5",
    date: "2026-10-13",
    title: "CSV import & keyboard shortcuts",
    items: [
      "Bulk client import from CSV with preview and template download",
      "Keyboard shortcuts help overlay (? key) + G+letter navigation",
      "Saved views/filters persistence (localStorage)",
      "Count-up number animation on dashboard KPIs",
    ],
  },
  {
    version: "1.4",
    date: "2026-10-13",
    title: "AI assistant & portal preview",
    items: [
      "AI thread summary + reply draft (LLM-powered)",
      "Client portal preview mode — see what the client sees",
      "Notifications dropdown panel in the topbar",
      "CSV export for clients and files",
    ],
  },
];

export function WhatsNewWidget() {
  // Track the last version the user has seen. If there are newer entries,
  // show the widget with a "new" badge. User can dismiss to mark as seen.
  const [lastSeenVersion, setLastSeenVersion] = usePersistentState<string>(
    "portal:changelog:lastSeen",
    ""
  );

  const unseen = CHANGELOG.filter(
    (e) => e.version !== lastSeenVersion
  );

  if (unseen.length === 0) return null;

  const dismiss = () => {
    setLastSeenVersion(CHANGELOG[0].version);
  };

  return (
    <Card className="surface-highlight border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              What's new
              <Badge variant="secondary" className="text-[9px] bg-primary/15 text-primary">
                {unseen.length} update{unseen.length === 1 ? "" : "s"}
              </Badge>
            </CardTitle>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={dismiss}
          aria-label="Dismiss changelog"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {unseen.slice(0, 3).map((entry) => (
          <div
            key={entry.version}
            className="rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px]">
                v{entry.version}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <p className="text-xs font-medium">{entry.title}</p>
            </div>
            <ul className="mt-1.5 space-y-1">
              {entry.items.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={dismiss}>
          Mark all as seen
        </Button>
      </CardContent>
    </Card>
  );
}
