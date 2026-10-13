"use client";

import * as React from "react";
import { useNav, type ViewKey } from "./nav-store";
import { useCurrentUser } from "./user-store";
import { useAuth } from "./auth/auth-store";
import {
  LayoutDashboard,
  Users,
  Inbox,
  KanbanSquare,
  FolderClosed,
  CheckCircle2,
  ClipboardList,
  Settings,
  ScrollText,
  Search,
  Menu,
  ChevronLeft,
  Moon,
  Sun,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "./query-hooks";
import { NotificationsPopover } from "./common/notifications-popover";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const focusMode = useNav((s) => s.focusMode);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {!focusMode && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const nav = useNav();
  const { data } = useQueryState("notifications-unread");
  const unread = (data as { count?: number } | undefined)?.count ?? 0;

  const inboxBadge = useQueryState("inbox-counts");
  const counts = (inboxBadge as { open?: number; unassigned?: number; unmatched?: number } | undefined) ?? {};

  const items: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "clients", label: "Clients", icon: Users },
    { key: "inbox", label: "Inbox", icon: Inbox, badge: counts.open ?? 0 },
    { key: "projects", label: "Projects", icon: KanbanSquare },
    { key: "files", label: "Files", icon: FolderClosed },
    { key: "approvals", label: "Approvals", icon: CheckCircle2 },
    { key: "forms", label: "Forms", icon: ClipboardList },
    { key: "audit", label: "Audit log", icon: ScrollText },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0",
          collapsed ? "w-[64px]" : "w-[244px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center gap-2 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground surface-highlight">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M21 3l-7 7" />
              <path d="M3 3l7 7" />
              <path d="M16 21h5v-5" />
              <path d="M8 21H3v-5" />
              <path d="M21 21l-7-7" />
              <path d="M3 21l7-7" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                Raptor Portal
              </p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight">
                Client workspace
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto hidden md:inline-flex h-7 w-7"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        <Separator className="bg-sidebar-border" />

        <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin p-2">
          {items.map((item) => {
            const active = nav.view === item.key || (item.key === "clients" && nav.view === "client");
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => nav.setView(item.key)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5"
                )}
              >
                {/* Active indicator bar */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn("h-4 w-4 shrink-0 transition-transform", active && "scale-110")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                ) : null}
                {collapsed && item.badge ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="m-2 space-y-2">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Workspace
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold">Raptor Portal</p>
              <p className="truncate text-[10px] text-muted-foreground">3 members · Free plan</p>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Storage
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sidebar-border">
                <div className="h-full w-[34%] rounded-full bg-primary" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                343 MB of 1 GB used
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const nav = useNav();
  const focusMode = useNav((s) => s.focusMode);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const user = useCurrentUser((s) => s.user);
  const { data: notifData } = useQueryState("notifications-unread");
  const unread = (notifData as { count?: number } | undefined)?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumbs / trail (hidden in focus mode) */}
      {!focusMode && (
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        {nav.trail.map((t, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronsUpDown className="h-3 w-3 rotate-90 text-muted-foreground/60" />}
            <button
              onClick={() => {
                if (t.view) nav.setView(t.view);
                else if (t.clientId) nav.openClient(t.clientId);
              }}
              className={cn(
                "truncate rounded px-1 py-0.5 text-sm transition-colors hover:text-foreground",
                i === nav.trail.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          </React.Fragment>
        ))}
      </nav>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 gap-2 sm:flex"
          onClick={() => nav.setCommandOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-muted-foreground">Search…</span>
          <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 sm:flex"
          aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
          title={focusMode ? "Exit focus mode" : "Focus mode (hide sidebar)"}
          onClick={() => useNav.getState().toggleFocusMode()}
        >
          {focusMode ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 sm:flex"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onClick={() => {
            // Dispatch ? to toggle the shortcut overlay
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
          }}
        >
          <span className="font-mono text-xs text-muted-foreground">?</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => nav.setCommandOpen(true)}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        <NotificationsPopover />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-2 rounded-full border border-border pl-1 pr-2 transition-colors hover:bg-muted">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                  {user ? user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("") : "ME"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium sm:inline">
                {user?.fullName ?? "Alex Mercer"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Signed in as
            </DropdownMenuLabel>
            <DropdownMenuLabel className="-mt-1 font-medium">
              {user?.fullName ?? "Alex Mercer"}
            </DropdownMenuLabel>
            <DropdownMenuLabel className="-mt-2 text-[11px] text-muted-foreground font-normal">
              {user?.email ?? "demo@raptorportal.app"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav.setView("settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav.setView("audit")}>
              <ScrollText className="mr-2 h-4 w-4" /> Audit log
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-foreground focus:text-rose-foreground"
              onClick={() => {
                useAuth.getState().logout();
                setTimeout(() => window.location.reload(), 300);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function Footer() {
  const nav = useNav();
  const inboxBadge = useQueryState("inbox-counts");
  const counts = (inboxBadge as { open?: number; unassigned?: number; unmatched?: number } | undefined) ?? {};
  const health = useQueryState("integrations");
  const integ = (health as { integrations?: { provider: string; status: string }[] } | undefined)?.integrations ?? [];
  const connected = integ.filter((i) => i.status === "connected").length;

  return (
    <footer className="mt-auto border-t border-border bg-background/80 px-4 py-2.5 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-foreground" />
            All systems operational
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            {connected}/{integ.length || 3} integrations connected
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {counts.open ?? 0} open · {counts.unassigned ?? 0} unassigned · {counts.unmatched ?? 0} unmatched
          </span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline font-mono">Raptor Portal · v2.0</span>
        </div>
      </div>
    </footer>
  );
}
