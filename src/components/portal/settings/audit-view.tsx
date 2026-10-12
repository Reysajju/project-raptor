"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ScrollText,
  Search,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQueryState } from "@/components/portal/query-hooks";
import { initials, relativeTime } from "@/lib/format";
import { AUDIT_ENTITIES, type AuditResponse, type AuditLogEntry } from "./types";

export function AuditView() {
  const [entity, setEntity] = React.useState<string>("all");
  const [action, setAction] = React.useState<string>("");

  // Build the query path with filters. The API supports entity + action
  // (contains) filtering. "all" means no entity filter.
  const queryPath = React.useMemo(() => {
    const params = new URLSearchParams();
    if (entity && entity !== "all") params.set("entity", entity);
    if (action.trim()) params.set("action", action.trim());
    params.set("limit", "200");
    const q = params.toString();
    return `/api/portal/audit${q ? `?${q}` : ""}`;
  }, [entity, action]);

  const { data, isLoading, refetch } = useQueryState<AuditResponse>(
    "audit",
    queryPath
  );

  const logs = data?.logs ?? [];

  const exportCsv = () => {
    if (logs.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = [
      "createdAt",
      "actor",
      "email",
      "role",
      "action",
      "entity",
      "entityId",
      "metadata",
    ];
    const rows = logs.map((l) => [
      l.createdAt,
      l.actor?.fullName ?? "—",
      l.actor?.email ?? "—",
      l.actor?.role ?? "—",
      l.action,
      l.entity,
      l.entityId ?? "",
      JSON.stringify(l.metadataJson ?? {}),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const c = String(cell ?? "");
            if (c.includes(",") || c.includes('"') || c.includes("\n")) {
              return `"${c.replace(/"/g, '""')}"`;
            }
            return c;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${logs.length} event${logs.length === 1 ? "" : "s"}`);
  };

  const copyEntityId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Entity ID copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Compliance
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-mono">{logs.length}</span> event
            {logs.length === 1 ? "" : "s"}
            {((entity && entity !== "all") || action.trim()) && " match your filters"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={exportCsv}
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card className="surface-highlight py-0">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entity
            </label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_ENTITIES.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Action contains
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. client.created"
                className="h-9 pl-8 font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-center text-xs"
              onClick={() => {
                setEntity("all");
                setAction("");
              }}
              disabled={(!entity || entity === "all") && !action.trim()}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card className="py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ScrollText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">No audit events match your filters.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Try clearing the entity or action filter.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setEntity("all");
                  setAction("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] text-xs">When</TableHead>
                    <TableHead className="text-xs">Actor</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Entity</TableHead>
                    <TableHead className="text-xs">Entity ID</TableHead>
                    <TableHead className="text-xs">Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.01, 0.2) }}
                      className="border-b transition-colors hover:bg-muted/40"
                    >
                      <TableCell
                        className="py-2.5 text-[11px] text-muted-foreground"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        {relativeTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <ActorCell log={log} />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {log.action}
                        </code>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs">{log.entity}</TableCell>
                      <TableCell className="py-2.5">
                        {log.entityId ? (
                          <button
                            onClick={() => copyEntityId(log.entityId!)}
                            className="group inline-flex max-w-[160px] items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] transition-colors hover:bg-muted"
                            title={`Copy: ${log.entityId}`}
                          >
                            <span className="truncate">
                              {truncateId(log.entityId)}
                            </span>
                            <Copy className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <MetadataCell log={log} />
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActorCell({ log }: { log: AuditLogEntry }) {
  if (!log.actor) {
    return <span className="text-xs italic text-muted-foreground">System</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
          {initials(log.actor.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{log.actor.fullName}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {log.actor.role}
        </p>
      </div>
    </div>
  );
}

function MetadataCell({ log }: { log: AuditLogEntry }) {
  const [open, setOpen] = React.useState(false);
  const meta = log.metadataJson ?? {};
  const keys = Object.keys(meta);
  if (keys.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const summary = keys.length === 1 ? `${keys[0]}` : `${keys.length} keys`;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {open ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="font-mono">{summary}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 max-w-[440px] overflow-x-auto rounded bg-muted p-2 text-[10px] leading-snug scrollbar-thin">
          {JSON.stringify(meta, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
