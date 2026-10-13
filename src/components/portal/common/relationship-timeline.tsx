"use client";

import * as React from "react";
import {
  UserPlus,
  Mail,
  MessageSquare,
  Phone,
  Globe,
  StickyNote,
  Zap,
  KanbanSquare,
  CheckCircle2,
  FileText,
  ClipboardList,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState } from "@/components/portal/query-hooks";
import { cn } from "@/lib/utils";

interface RelationshipEvent {
  type: string;
  date: string;
  title: string;
  detail?: string;
  icon: string;
}

interface RelationshipResponse {
  events: RelationshipEvent[];
  count: number;
  firstDate: string;
  lastDate: string;
  spanDays: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  "user-plus": UserPlus,
  mail: Mail,
  message: MessageSquare,
  phone: Phone,
  globe: Globe,
  note: StickyNote,
  zap: Zap,
  kanban: KanbanSquare,
  check: CheckCircle2,
  "check-circle": CheckCircle2,
  file: FileText,
  clipboard: ClipboardList,
  alert: AlertTriangle,
};

const TYPE_COLOR: Record<string, string> = {
  created: "bg-primary text-primary-foreground",
  first_email: "bg-sky text-sky-foreground",
  first_sms: "bg-emerald text-emerald-foreground",
  first_call: "bg-accent text-accent-foreground",
  first_portal: "bg-amber text-amber-foreground",
  first_note: "bg-muted text-muted-foreground",
  project: "bg-primary text-primary-foreground",
  milestone: "bg-emerald text-emerald-foreground",
  file: "bg-muted text-muted-foreground",
  approval: "bg-amber text-amber-foreground",
  approval_decision: "bg-emerald text-emerald-foreground",
  form: "bg-sky text-sky-foreground",
};

export function RelationshipTimeline({ clientId }: { clientId: string }) {
  const { data, isLoading } = useQueryState<RelationshipResponse>(
    `client-${clientId}-relationship`,
    `/api/portal/clients/${clientId}/relationship`
  );
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(true);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  React.useEffect(() => {
    updateScrollState();
  }, [data, updateScrollState]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <Card className="surface-highlight">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Relationship timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.events.length === 0) {
    return null;
  }

  const { events, spanDays, count } = data;

  return (
    <Card className="surface-highlight">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Relationship timeline</CardTitle>
          <CardDescription className="text-xs">
            {count} milestone{count === 1 ? "" : "s"} over {spanDays} day{spanDays === 1 ? "" : "s"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 disabled:opacity-30"
            onClick={() => scroll("left")}
            disabled={!canLeft}
            aria-label="Scroll timeline left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 disabled:opacity-30"
            onClick={() => scroll("right")}
            disabled={!canRight}
            aria-label="Scroll timeline right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-0 overflow-x-auto scrollbar-thin pb-2"
        >
          {/* Timeline line */}
          <div className="relative flex min-w-full">
            {/* Horizontal connector line */}
            <div className="absolute left-0 right-0 top-[14px] h-px bg-border" />
            {events.map((e, i) => {
              const Icon = ICON_MAP[e.icon] ?? Zap;
              const color = TYPE_COLOR[e.type] ?? "bg-muted text-muted-foreground";
              const d = new Date(e.date);
              return (
                <div
                  key={i}
                  className="relative flex w-[200px] shrink-0 flex-col items-start pr-3"
                >
                  {/* Node */}
                  <div
                    className={cn(
                      "z-10 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background",
                      color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {/* Date */}
                  <p className="mt-1.5 font-mono text-[10px] tabular text-muted-foreground">
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}
                  </p>
                  {/* Title */}
                  <p className="mt-0.5 text-xs font-medium leading-snug">{e.title}</p>
                  {e.detail && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{e.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
