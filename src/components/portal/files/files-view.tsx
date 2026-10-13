"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FolderClosed,
  FolderOpen,
  Upload,
  Search,
  ChevronDown,
  HardDrive,
  CloudUpload,
  Download,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useQueryState } from "@/components/portal/query-hooks";
import { useNav } from "@/components/portal/nav-store";
import { formatBytes } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { EmptyState as EmptyStateCard } from "@/components/portal/common/empty-state";
import { cn } from "@/lib/utils";
import type {
  FilesResponse,
  ClientsResponse,
  FileItem,
} from "./types";
import { STORAGE_CAP_BYTES, STORAGE_CAP_MB } from "./types";
import { FileRow } from "./file-row";
import { UploadDialog } from "./upload-dialog";

export function FilesView() {
  const nav = useNav();
  const { data, isLoading, isError, refetch } = useQueryState<FilesResponse>(
    "files",
    "/api/portal/files"
  );
  const { data: clientsData } = useQueryState<ClientsResponse>(
    "clients",
    "/api/portal/clients"
  );

  // Local UI state
  const [search, setSearch] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState<string>("__all__");
  const [folderFilter, setFolderFilter] = React.useState<string>("__all__");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadPreset, setUploadPreset] = React.useState<{
    fileName?: string | null;
    folder?: string | null;
    clientId?: string | null;
  } | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const files = data?.files ?? [];
  const clients = clientsData?.clients ?? [];

  // Derive unique folders from currently visible files (after client filter, before folder filter).
  const visibleAfterClient = React.useMemo(
    () =>
      files.filter(
        (f) => clientFilter === "__all__" || f.clientId === clientFilter
      ),
    [files, clientFilter]
  );

  const foldersFromVisible = React.useMemo(() => {
    const set = new Set<string>();
    for (const f of visibleAfterClient) set.add(f.folder || "General");
    return Array.from(set).sort();
  }, [visibleAfterClient]);

  // Search + client + folder filters.
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleAfterClient.filter((f) => {
      if (folderFilter !== "__all__" && (f.folder || "General") !== folderFilter) {
        return false;
      }
      if (q && !f.fileName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [visibleAfterClient, folderFilter, search]);

  // Group by folder.
  const grouped = React.useMemo(() => {
    const map = new Map<string, FileItem[]>();
    for (const f of filtered) {
      const key = f.folder || "General";
      const bucket = map.get(key);
      if (bucket) bucket.push(f);
      else map.set(key, [f]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const totalBytes = data?.totalBytes ?? 0;
  const usedMB = totalBytes / (1024 * 1024);
  const usagePct = Math.min(100, (totalBytes / STORAGE_CAP_BYTES) * 100);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No files to export");
      return;
    }
    exportToCsv(
      `files-${new Date().toISOString().slice(0, 10)}`,
      ["File name", "Folder", "Client", "Project", "Version", "Size (bytes)", "Shared with client", "Uploaded by", "Created"],
      filtered.map((f) => [
        f.fileName,
        f.folder || "General",
        f.client?.name || "",
        f.project?.title || "",
        `v${f.version}`,
        f.sizeBytes,
        f.sharedWithClient ? "Yes" : "No",
        f.uploader?.fullName || "",
        new Date(f.createdAt).toISOString(),
      ])
    );
  };
  const usageTone =
    usagePct > 90 ? "rose" : usagePct > 70 ? "amber" : "emerald";
  const usageBarClass =
    usageTone === "rose"
      ? "bg-rose-foreground"
      : usageTone === "amber"
        ? "bg-amber-foreground"
        : "bg-emerald-foreground";

  // Drag-and-drop handlers (decorative — opens the upload dialog).
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    const first = dropped[0];
    setUploadPreset({
      fileName: first ? first.name : null,
      folder: null,
      clientId: clientFilter !== "__all__" ? clientFilter : null,
    });
    setUploadOpen(true);
    if (dropped.length > 0) {
      toast.info("Drop accepted", {
        description: `Opening upload dialog for ${dropped.length} file(s).`,
      });
    }
  }

  function openUpload() {
    setUploadPreset({
      fileName: null,
      folder: null,
      clientId: clientFilter !== "__all__" ? clientFilter : null,
    });
    setUploadOpen(true);
  }

  // Auto-collapse: if folder filter is set, only that folder is visible.
  React.useEffect(() => {
    if (folderFilter !== "__all__") {
      setCollapsed((c) => ({ ...c, [folderFilter]: false }));
    }
  }, [folderFilter]);

  if (isError) {
    return (
      <div className="space-y-5">
        <HeaderSkeleton />
        <div className="rounded-lg border border-rose/40 bg-rose/20 p-4 text-sm text-rose-foreground">
          Failed to load files.
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <HeaderSkeleton />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vault
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-mono tabular">{data.count}</span> files ·{" "}
            <span className="font-mono tabular">{formatBytes(data.totalBytes)}</span>{" "}
            used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={!data || filtered.length === 0}
            title="Export filtered files to CSV"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav.setView("clients")}>
            Browse clients
          </Button>
          <Button size="sm" onClick={openUpload}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload file
          </Button>
        </div>
      </div>

      {/* Storage meter */}
      <div className="rounded-lg border border-border bg-card p-4 surface-highlight">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            Storage usage
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono tabular text-foreground">
              {usedMB.toFixed(1)} MB
            </span>{" "}
            of <span className="font-mono tabular">{STORAGE_CAP_MB} MB</span> used ·{" "}
            <span className="font-mono tabular">{usagePct.toFixed(2)}%</span>
          </p>
        </div>
        <div
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Number(usagePct.toFixed(1))}
          aria-label="Storage usage"
        >
          <div
            className={cn("h-full rounded-full transition-all", usageBarClass)}
            style={{ width: `${Math.max(0.5, usagePct)}%` }}
          />
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs transition-colors",
          dragOver
            ? "border-primary bg-accent/40 text-accent-foreground"
            : "border-border bg-card/50 text-muted-foreground hover:bg-muted/30"
        )}
        role="button"
        tabIndex={0}
        onClick={openUpload}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openUpload();
          }
        }}
      >
        <CloudUpload className="h-4 w-4" />
        <span>
          Drop files here to upload, or{" "}
          <span className="text-foreground underline-offset-2 hover:underline">
            browse
          </span>
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name…"
            className="pl-8"
            aria-label="Search files by name"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by client">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={folderFilter}
          onValueChange={setFolderFilter}
          disabled={foldersFromVisible.length === 0}
        >
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by folder">
            <SelectValue placeholder="All folders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All folders</SelectItem>
            {foldersFromVisible.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List / empty state */}
      {filtered.length === 0 ? (
        <EmptyFiles
          hasFiles={files.length > 0}
          onUpload={openUpload}
          onClear={() => {
            setSearch("");
            setClientFilter("__all__");
            setFolderFilter("__all__");
          }}
        />
      ) : (
        <div className="space-y-3">
          {grouped.map(([folder, items]) => {
            const folderBytes = items.reduce((s, f) => s + f.sizeBytes, 0);
            const isCollapsed = collapsed[folder] ?? false;
            return (
              <Collapsible
                key={folder}
                open={!isCollapsed}
                onOpenChange={(open) =>
                  setCollapsed((c) => ({ ...c, [folder]: !open }))
                }
                className="rounded-lg border border-border bg-card surface-highlight"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                    aria-expanded={!isCollapsed}
                    aria-label={`Toggle ${folder} folder`}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                    {isCollapsed ? (
                      <FolderClosed className="h-4 w-4 text-accent-foreground" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-accent-foreground" />
                    )}
                    <span className="text-sm font-medium">{folder}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {items.length} file{items.length === 1 ? "" : "s"} ·{" "}
                      <span className="font-mono">{formatBytes(folderBytes)}</span>
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="divide-y divide-border border-t border-border">
                    <AnimatePresence initial={false}>
                      {items.map((f) => (
                        <FileRow
                          key={f.id}
                          file={f}
                          folders={foldersFromVisible}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={foldersFromVisible.length ? foldersFromVisible : Array.from(new Set(files.map((f) => f.folder)))}
        defaultFileName={uploadPreset?.fileName ?? null}
        defaultFolder={uploadPreset?.folder ?? null}
        defaultClientId={uploadPreset?.clientId ?? null}
      />
    </div>
  );
}

function EmptyFiles({
  hasFiles,
  onUpload,
  onClear,
}: {
  hasFiles: boolean;
  onUpload: () => void;
  onClear: () => void;
}) {
  return (
    <EmptyStateCard
      illustration="files"
      title={hasFiles ? "No files match your filters" : "No files yet"}
      description={
        hasFiles
          ? "Try clearing your search or filters."
          : "Upload your first file to get started."
      }
      action={
        hasFiles ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button size="sm" onClick={onUpload}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload your first file
          </Button>
        )
      }
    />
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />
      <div className="h-3 w-56 animate-pulse rounded bg-muted" />
    </div>
  );
}
