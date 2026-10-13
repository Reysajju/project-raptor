"use client";

import * as React from "react";
import { useNav, type ViewKey } from "../nav-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { apiGet, useQueryState } from "../query-hooks";
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
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Search,
  CornerDownLeft,
} from "lucide-react";

interface SearchResult {
  results: {
    clients: { id: string; name: string; company: string | null; status: string; accentColor: string; kind: "client" }[];
    comms: { id: string; clientId: string | null; channel: string; subject: string; preview: string; occurredAt: string; client: { id: string; name: string } | null; kind: "comm" }[];
    files: { id: string; fileName: string; folder: string; clientId: string | null; client: { id: string; name: string } | null; kind: "file" }[];
    projects: { id: string; title: string; status: string; clientId: string | null; client: { id: string; name: string } | null; kind: "project" }[];
  };
}

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "clients", label: "Clients", icon: Users },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "projects", label: "Projects", icon: KanbanSquare },
  { key: "files", label: "Files", icon: FolderClosed },
  { key: "approvals", label: "Approvals", icon: CheckCircle2 },
  { key: "forms", label: "Forms", icon: ClipboardList },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "audit", label: "Audit log", icon: ScrollText },
];

export function CommandPalette() {
  const nav = useNav();
  const open = useNav((s) => s.commandOpen);
  const setOpen = useNav((s) => s.setCommandOpen);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [searching, setSearching] = React.useState(false);

  // Keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setOpen]);

  // Debounced search
  React.useEffect(() => {
    if (!open) {
      setQ("");
      setResults(null);
      return;
    }
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiGet<SearchResult>(`/api/portal/search?q=${encodeURIComponent(q)}`);
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q, open]);

  const close = () => setOpen(false);

  const goView = (v: ViewKey) => {
    nav.setView(v);
    close();
  };
  const openClient = (id: string) => {
    nav.openClient(id);
    close();
  };

  const r = results?.results;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="max-w-2xl">
      <CommandInput
        placeholder="Search clients, communications, files, projects or jump to a view…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          {searching ? "Searching…" : q ? "No matches found." : "Type to search."}
        </CommandEmpty>

        {(!q || q.trim().length < 2) && (
          <>
            <CommandGroup heading="Navigate">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.key}
                    value={`go ${item.label}`}
                    onSelect={() => goView(item.key)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Go to {item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Quick actions">
              <CommandItem
                value="new client create"
                onSelect={() => {
                  goView("clients");
                }}
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Create new client</span>
                <kbd className="ml-auto rounded border border-border bg-muted px-1 font-mono text-[9px] text-muted-foreground">N</kbd>
              </CommandItem>
              <CommandItem
                value="log note internal"
                onSelect={() => goView("inbox")}
              >
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Log an internal note</span>
              </CommandItem>
              <CommandItem
                value="simulate webhook fire event"
                onSelect={() => goView("settings")}
              >
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Open webhook simulator</span>
              </CommandItem>
              <CommandItem
                value="toggle theme dark light"
                onSelect={() => {
                  const isDark = document.documentElement.classList.contains("dark");
                  document.documentElement.classList.toggle("dark", !isDark);
                  try {
                    localStorage.setItem("theme", isDark ? "light" : "dark");
                  } catch {}
                  close();
                }}
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Toggle dark / light theme</span>
              </CommandItem>
              <CommandItem
                value="focus mode hide sidebar"
                onSelect={() => {
                  useNav.getState().toggleFocusMode();
                  close();
                }}
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Toggle focus mode</span>
              </CommandItem>
              <CommandItem
                value="shortcuts help keyboard"
                onSelect={() => {
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
                  close();
                }}
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Show keyboard shortcuts</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {r && r.clients.length > 0 && (
          <>
            <CommandGroup heading="Clients">
              {r.clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`client ${c.name} ${c.company ?? ""}`}
                  onSelect={() => openClient(c.id)}
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                  {c.company && (
                    <span className="ml-1 text-muted-foreground">· {c.company}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {r && r.comms.length > 0 && (
          <>
            <CommandGroup heading="Communications">
              {r.comms.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`comm ${c.subject} ${c.preview}`}
                  onSelect={() => {
                    if (c.clientId) openClient(c.clientId);
                    else goView("inbox");
                  }}
                >
                  {c.channel === "email" ? (
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  ) : c.channel === "call" ? (
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  ) : c.channel === "sms" ? (
                    <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="text-muted-foreground">{c.client?.name ?? "Unmatched"}:</span>{" "}
                      {c.subject || c.preview}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {r && r.projects.length > 0 && (
          <>
            <CommandGroup heading="Projects">
              {r.projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.title}`}
                  onSelect={() => {
                    if (p.clientId) openClient(p.clientId);
                    else goView("projects");
                  }}
                >
                  <KanbanSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{p.title}</span>
                  <span className="ml-1 text-muted-foreground">· {p.client?.name ?? "—"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {r && r.files.length > 0 && (
          <CommandGroup heading="Files">
            {r.files.map((f) => (
              <CommandItem
                key={f.id}
                value={`file ${f.fileName}`}
                onSelect={() => {
                  if (f.clientId) openClient(f.clientId);
                  else goView("files");
                }}
              >
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{f.fileName}</span>
                <span className="ml-1 text-muted-foreground">· {f.folder}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd>
          navigate
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            <CornerDownLeft className="inline h-3 w-3" />
          </kbd>
          select
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">esc</kbd>
          close
        </span>
      </div>
    </CommandDialog>
  );
}
