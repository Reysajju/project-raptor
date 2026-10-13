"use client";

import * as React from "react";
import { Bell, CheckCheck, Inbox as InboxIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQueryState, apiPatch } from "@/components/portal/query-hooks";
import { useNav } from "@/components/portal/nav-store";
import { relativeTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  payloadJson: string;
  readAt: string | null;
  createdAt: string;
}

interface NotifResponse {
  count: number;
  recent: NotifItem[];
}

const typeIcon: Record<string, LucideIcon> = {
  assignment: InboxIcon,
  approval: CheckCheck,
  triage: InboxIcon,
  form: CheckCheck,
};

export function NotificationsPopover() {
  const [open, setOpen] = React.useState(false);
  const { data, refetch } = useQueryState<NotifResponse>("notifications-unread");
  const qc = useQueryClient();
  const nav = useNav();

  const count = data?.count ?? 0;
  const items = data?.recent ?? [];

  const markAllRead = React.useCallback(async () => {
    try {
      await apiPatch("/api/portal/notifications-unread", {});
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Couldn't mark notifications as read");
    }
  }, [qc]);

  const handleOpen = (n: NotifItem) => {
    setOpen(false);
    let payload: { clientId?: string; channel?: string; commId?: string } = {};
    try {
      payload = JSON.parse(n.payloadJson);
    } catch {
      // ignore
    }
    if (payload.clientId) {
      nav.openClient(payload.clientId);
    } else if (n.type === "triage") {
      nav.setInboxFilter("unmatched");
      nav.setView("inbox");
    } else {
      nav.setView("inbox");
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) refetch(); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-foreground px-1 text-[9px] font-bold text-white",
                count > 9 && "px-1"
              )}
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-0"
        aria-describedby={undefined}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-medium text-accent-foreground">
                {count}
              </span>
            )}
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px]"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">No unread notifications.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = typeIcon[n.type] ?? Bell;
                const payload = safeParse(n.payloadJson);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleOpen(n)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/60 text-accent-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground leading-snug">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        {items.length > 0 && (
          <>
            <Separator />
            <button
              onClick={() => { setOpen(false); nav.setView("inbox"); }}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <InboxIcon className="h-3.5 w-3.5" /> Open inbox
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
