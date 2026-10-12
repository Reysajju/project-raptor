"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNav } from "@/components/portal/nav-store";
import { useCurrentUser } from "@/components/portal/user-store";
import { useQueryState, apiPost, apiPatch } from "@/components/portal/query-hooks";
import { StatusBadge } from "@/components/portal/common/status-badge";
import { cn } from "@/lib/utils";
import { initials, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ArrowUpDown,
  Inbox,
  FolderClosed,
  KanbanSquare,
  RefreshCw,
  Download,
  Upload,
  Users,
  Trash2,
} from "lucide-react";
import { exportToCsv } from "@/lib/csv";
import { usePersistentState } from "@/lib/use-persistent-state";
import { EmptyState as EmptyStateCard } from "@/components/portal/common/empty-state";
import { ImportClientsDialog } from "./import-dialog";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface ClientContact {
  id: string;
  type: string;
  value: string;
  label: string;
  isPrimary: boolean;
}

interface ClientListItem {
  id: string;
  name: string;
  company: string;
  status: string;
  tags: string[];
  ownerId: string | null;
  owner: { id: string; fullName: string } | null;
  accentColor: string;
  notes: string;
  contacts: ClientContact[];
  customFields: Record<string, unknown>;
  openItems: number;
  activeProjects: number;
  fileCount: number;
  updatedAt: string;
}

interface ClientListResponse {
  clients: ClientListItem[];
}

interface TeamResponse {
  team: TeamMember[];
}

const ACCENT_RING: Record<string, string> = {
  violet: "bg-accent text-accent-foreground",
  emerald: "bg-emerald text-emerald-foreground",
  sky: "bg-sky text-sky-foreground",
  amber: "bg-amber text-amber-foreground",
  rose: "bg-rose text-rose-foreground",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "prospect", label: "Prospect" },
  { key: "paused", label: "Paused" },
  { key: "churned", label: "Churned" },
] as const;

type SortKey = "updatedAt" | "name" | "openItems";

export function ClientsView() {
  const nav = useNav();
  const { data, isLoading, error, refetch } = useQueryState<ClientListResponse>(
    "clients",
    "/api/portal/clients"
  );
  const clients = data?.clients ?? [];

  const [search, setSearch] = usePersistentState<string>("portal:clients:search", "");
  const [filter, setFilter] = usePersistentState<(typeof FILTERS)[number]["key"]>("portal:clients:filter", "all");
  const [sort, setSort] = usePersistentState<SortKey>("portal:clients:sort", "updatedAt");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const f = clients.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      const hay = [c.name, c.company, ...c.tags].join(" ").toLowerCase();
      return hay.includes(q);
    });
    return f.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "openItems") return b.openItems - a.openItems;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [clients, search, filter, sort]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No clients to export");
      return;
    }
    exportToCsv(
      `clients-${new Date().toISOString().slice(0, 10)}`,
      ["Name", "Company", "Status", "Tags", "Owner", "Open items", "Active projects", "Files", "Updated"],
      filtered.map((c) => [
        c.name,
        c.company || "",
        c.status,
        c.tags.join("; "),
        c.owner?.fullName || "",
        c.openItems,
        c.activeProjects,
        c.fileCount,
        new Date(c.updatedAt).toISOString(),
      ])
    );
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((c) => c.id));
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-medium text-rose-foreground">Failed to load clients.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Directory
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${clients.length} total · ${clients.filter((c) => c.status === "active").length} active · ${clients.filter((c) => c.status === "prospect").length} prospects`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={isLoading || filtered.length === 0}
            title="Export filtered clients to CSV"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <ImportClientsButton />
          <NewClientSheet />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, tags…"
            className="pl-9"
            aria-label="Search clients"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              active={filter === f.key}
              onClick={() => setFilter(f.key)}
              label={f.label}
              count={f.key === "all" ? clients.length : clients.filter((c) => c.status === f.key).length}
            />
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedCount={selected.size}
          selectedIds={Array.from(selected)}
          clients={filtered.filter((c) => selected.has(c.id))}
          onClear={() => setSelected(new Set())}
          onDone={() => {
            setSelected(new Set());
          }}
        />
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <DirectorySkeleton />
      ) : filtered.length === 0 ? (
        <ClientsEmptyState
          search={search}
          filter={filter}
          onClear={() => {
            setSearch("");
            setFilter("all");
          }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Select all clients"
                      className="size-4 rounded border-border bg-input align-middle accent-primary"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <SortableHead label="Client" active={sort === "name"} onClick={() => setSort("name")} />
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Owner</TableHead>
                  <SortableHead
                    label="Open"
                    active={sort === "openItems"}
                    onClick={() => setSort("openItems")}
                    className="text-right"
                  />
                  <TableHead className="text-right">Projects</TableHead>
                  <SortableHead
                    label="Updated"
                    active={sort === "updatedAt"}
                    onClick={() => setSort("updatedAt")}
                    className="text-right pr-4"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const isSel = selected.has(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      data-state={isSel ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => nav.openClient(c.id)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${c.name}`}
                          className="size-4 rounded border-border bg-input align-middle accent-primary"
                          checked={isSel}
                          onChange={() => toggleOne(c.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback
                              className={cn("text-[11px] font-medium", ACCENT_RING[c.accentColor] ?? ACCENT_RING.violet)}
                            >
                              {initials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{c.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.company || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {c.tags.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            c.tags.slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                                {t}
                              </Badge>
                            ))
                          )}
                          {c.tags.length > 2 && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                              +{c.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.owner ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-muted text-[9px]">
                                {initials(c.owner.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{c.owner.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular">
                        {c.openItems > 0 ? (
                          <span className={c.openItems > 2 ? "text-amber-foreground" : ""}>{c.openItems}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular">{c.activeProjects}</TableCell>
                      <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                        {relativeTime(c.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:hidden">
            {filtered.map((c) => (
              <ClientMobileCard
                key={c.id}
                client={c}
                onOpen={() => nav.openClient(c.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SortableHead({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", active ? "text-foreground" : "text-muted-foreground/50")} />
      </button>
    </TableHead>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      )}
      aria-pressed={active}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] tabular",
          active ? "bg-primary-foreground/20" : "bg-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ClientMobileCard({
  client,
  onOpen,
}: {
  client: ClientListItem;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      whileTap={{ scale: 0.98 }}
      className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 surface-highlight"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback
            className={cn("text-xs", ACCENT_RING[client.accentColor] ?? ACCENT_RING.violet)}
          >
            {initials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{client.name}</p>
              <p className="truncate text-xs text-muted-foreground">{client.company || "—"}</p>
            </div>
            <StatusBadge status={client.status} />
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Inbox className="h-3 w-3" /> {client.openItems} open
            </span>
            <span className="inline-flex items-center gap-1">
              <KanbanSquare className="h-3 w-3" /> {client.activeProjects}
            </span>
            <span className="inline-flex items-center gap-1">
              <FolderClosed className="h-3 w-3" /> {client.fileCount}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function ClientsEmptyState({
  search,
  filter,
  onClear,
}: {
  search: string;
  filter: string;
  onClear: () => void;
}) {
  const hasFilter = !!search || filter !== "all";
  return (
    <EmptyStateCard
      illustration="clients"
      title={hasFilter ? "No clients found" : "No clients yet"}
      description={
        hasFilter
          ? "Try adjusting your search or filters."
          : "Create your first client using the “New client” button."
      }
      action={
        hasFilter ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : null
      }
    />
  );
}

function DirectorySkeleton() {
  return (
    <Card className="p-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </Card>
  );
}

function ImportClientsButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        title="Import clients from CSV"
      >
        <Upload className="h-3.5 w-3.5" /> Import
      </Button>
      <ImportClientsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

interface ClientListItem {
  id: string;
  name: string;
  company?: string | null;
  status: string;
  tags: string[];
  ownerId?: string | null;
  owner?: { fullName: string } | null;
}

function BulkActionBar({
  selectedCount,
  selectedIds,
  clients,
  onClear,
  onDone,
}: {
  selectedCount: number;
  selectedIds: string[];
  clients: ClientListItem[];
  onClear: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const { data: teamData } = useQueryState<{ team: { id: string; fullName: string }[] }>("team", "/api/portal/team");
  const team = teamData?.team ?? [];
  const [tagOpen, setTagOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [tagValue, setTagValue] = React.useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const exportSelected = () => {
    exportToCsv(
      `clients-selected-${new Date().toISOString().slice(0, 10)}`,
      ["Name", "Company", "Status", "Tags", "Owner", "Open items", "Active projects", "Files", "Updated"],
      clients.map((c) => [
        c.name,
        c.company || "",
        c.status,
        c.tags.join("; "),
        c.owner?.fullName || "",
        (c as { openItems?: number }).openItems ?? 0,
        (c as { activeProjects?: number }).activeProjects ?? 0,
        (c as { fileCount?: number }).fileCount ?? 0,
        (c as { updatedAt?: string }).updatedAt ?? "",
      ])
    );
  };

  const assignOwner = async (ownerId: string | null) => {
    setAssignOpen(false);
    try {
      await Promise.all(selectedIds.map((id) => apiPatch(`/api/portal/clients/${id}`, { ownerId })));
      toast.success(`Assigned ${selectedIds.length} client${selectedIds.length === 1 ? "" : "s"}`);
      refresh();
    } catch (err) {
      toast.error("Bulk assign failed", { description: (err as Error).message });
    }
  };

  const addTag = async () => {
    const tag = tagValue.trim();
    if (!tag) return;
    setTagOpen(false);
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const client = clients.find((c) => c.id === id);
          const existing = client?.tags ?? [];
          if (!existing.includes(tag)) {
            await apiPatch(`/api/portal/clients/${id}`, { tags: [...existing, tag] });
          }
        })
      );
      toast.success(`Tagged ${selectedIds.length} client${selectedIds.length === 1 ? "" : "s"} with "${tag}"`);
      setTagValue("");
      refresh();
    } catch (err) {
      toast.error("Bulk tag failed", { description: (err as Error).message });
    }
  };

  const deleteSelected = async () => {
    setDeleteOpen(false);
    try {
      // Soft-delete via PATCH (the DELETE endpoint also soft-deletes; use PATCH to avoid accidental hard delete)
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/portal/clients/${id}`, { method: "DELETE" }).then((r) => r.json())
        )
      );
      toast.success(`Archived ${selectedIds.length} client${selectedIds.length === 1 ? "" : "s"}`);
      onDone();
      refresh();
    } catch (err) {
      toast.error("Bulk archive failed", { description: (err as Error).message });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-[10px] font-semibold text-accent-foreground tabular">
          {selectedCount}
        </span>
        <span className="font-medium">selected</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={exportSelected}>
          <Download className="h-3 w-3" /> Export
        </Button>

        {/* Tag popover */}
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="h-3 w-3" /> Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="end">
            <Label className="text-[11px] text-muted-foreground">Add tag to {selectedCount} clients</Label>
            <Input
              autoFocus
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
              placeholder="e.g. vip, q4-renewal"
              className="mt-1.5 h-8 text-xs"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTagOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={addTag} disabled={!tagValue.trim()}>Add tag</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Assign owner popover */}
        <Popover open={assignOpen} onOpenChange={setAssignOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Users className="h-3 w-3" /> Assign
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <p className="px-1 py-1 text-[11px] text-muted-foreground">Assign owner to {selectedCount} clients</p>
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {team.map((m) => (
                <button
                  key={m.id}
                  onClick={() => assignOwner(m.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-muted text-[9px]">{initials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  {m.fullName}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs text-rose-foreground hover:bg-rose/20" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3 w-3" /> Archive
        </Button>

        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-base">Archive {selectedCount} client{selectedCount === 1 ? "" : "s"}?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Selected clients will be soft-archived (hidden from the directory).
            This won't delete their communications, files, or projects.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={deleteSelected}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewClientSheet() {
  const qc = useQueryClient();
  const user = useCurrentUser((s) => s.user);
  const { data: teamData } = useQueryState<TeamResponse>("team", "/api/portal/team");
  const team = teamData?.team ?? [];
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    company: "",
    status: "prospect" as "active" | "prospect" | "churned" | "paused",
    tags: "",
    ownerId: "",
    accentColor: "violet" as "violet" | "emerald" | "sky" | "amber" | "rose",
    notes: "",
  });

  // Reset form when opening
  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setForm({
        name: "",
        company: "",
        status: "prospect",
        tags: "",
        ownerId: user?.id ?? "",
        accentColor: "violet",
        notes: "",
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Client name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/portal/clients", {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        status: form.status,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        ownerId: form.ownerId || null,
        accentColor: form.accentColor,
        notes: form.notes,
        actorId: user?.id ?? null,
      });
      toast.success(`Client “${form.name.trim()}” created.`);
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    } catch (err) {
      toast.error("Could not create client.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New client
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New client</SheetTitle>
          <SheetDescription>
            Create a client record. You can fill in details and contacts later.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
          <div className="space-y-1.5">
            <Label htmlFor="nc-name">Name *</Label>
            <Input
              id="nc-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Eleanor Whitfield"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-company">Company</Label>
            <Input
              id="nc-company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Northwind Traders"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger id="nc-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-accent">Accent</Label>
              <Select value={form.accentColor} onValueChange={(v) => setForm({ ...form, accentColor: v as typeof form.accentColor })}>
                <SelectTrigger id="nc-accent" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="sky">Sky</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-tags">Tags</Label>
            <Input
              id="nc-tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="enterprise, retail"
            />
            <p className="text-[11px] text-muted-foreground">Comma-separated.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-owner">Owner</Label>
            <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
              <SelectTrigger id="nc-owner" className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-notes">Notes</Label>
            <Textarea
              id="nc-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes…"
              rows={3}
            />
          </div>
        </form>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating…" : "Create client"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
