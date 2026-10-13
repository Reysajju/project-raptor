"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNav } from "@/components/portal/nav-store";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; label: string; icon?: LucideIcon }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette / search", icon: Search },
      { keys: ["?"], label: "Show this shortcuts help" },
      { keys: ["G", "D"], label: "Go to Dashboard" },
      { keys: ["G", "C"], label: "Go to Clients" },
      { keys: ["G", "I"], label: "Go to Inbox" },
      { keys: ["G", "P"], label: "Go to Projects" },
      { keys: ["G", "F"], label: "Go to Files" },
      { keys: ["G", "A"], label: "Go to Approvals" },
      { keys: ["G", "S"], label: "Go to Settings" },
      { keys: ["Esc"], label: "Close dialog / overlay" },
    ],
  },
  {
    title: "Topbar",
    items: [
      { keys: ["Click"], label: "Focus toggle — hide sidebar for distraction-free work" },
      { keys: ["Click"], label: "? button — open this shortcuts help" },
    ],
  },
  {
    title: "Inbox",
    items: [
      { keys: ["J"], label: "Move to next thread", icon: ArrowDown },
      { keys: ["K"], label: "Move to previous thread", icon: ArrowUp },
      { keys: ["E"], label: "Mark current thread done" },
      { keys: ["Z"], label: "Snooze current thread" },
      { keys: ["A"], label: "Open assign menu" },
      { keys: ["R"], label: "Focus reply composer" },
    ],
  },
  {
    title: "Composer",
    items: [
      { keys: ["⌘", "↵"], label: "Send message / note", icon: CornerDownLeft },
    ],
  },
];

export function ShortcutHelpOverlay() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (typeof target?.isContentEditable === "boolean" && target.isContentEditable);
      // Only trigger on "?" when NOT typing, and ignore shift+? (which is just ?)
      if (e.key === "?" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Command className="h-4 w-4 text-muted-foreground" />
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title} className="min-w-0">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {g.title}
              </p>
              <ul className="space-y-1.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        {Icon && <Icon className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {item.keys.map((k, i) => (
                          <Kbd key={i} className="text-[10px]">{k}</Kbd>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
          Tip: press <Kbd className="text-[10px]">?</Kbd> anywhere (except inputs) to open this help.
        </p>
      </DialogContent>
    </Dialog>
    </>
  );
}
