"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquarePlus, RotateCcw, Inbox } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useQueryState } from "@/components/portal/query-hooks";
import type { ApprovalsResponse, Approval } from "./types";
import { ApprovalCard } from "./approval-card";
import { DecisionDialog, type DecisionMode } from "./decision-dialog";

type FilterKey = "all" | "pending" | "approved" | "changes_requested";

interface PillDef {
  key: FilterKey;
  label: string;
  count: number;
  tone: string;
}

export function ApprovalsView() {
  const { data, isLoading, isError, refetch } = useQueryState<ApprovalsResponse>(
    "approvals",
    "/api/portal/approvals"
  );

  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [decision, setDecision] = React.useState<{
    approval: Approval | null;
    mode: DecisionMode | null;
  }>({ approval: null, mode: null });

  const approvals = data?.approvals ?? [];

  const counts = React.useMemo(
    () => ({
      pending: approvals.filter((a) => a.status === "pending").length,
      approved: approvals.filter((a) => a.status === "approved").length,
      changes_requested: approvals.filter(
        (a) => a.status === "changes_requested"
      ).length,
    }),
    [approvals]
  );

  const pills: PillDef[] = [
    {
      key: "all",
      label: "All",
      count: approvals.length,
      tone: "bg-muted text-foreground",
    },
    {
      key: "pending",
      label: "Pending",
      count: counts.pending,
      tone: "bg-amber text-amber-foreground",
    },
    {
      key: "approved",
      label: "Approved",
      count: counts.approved,
      tone: "bg-emerald text-emerald-foreground",
    },
    {
      key: "changes_requested",
      label: "Changes requested",
      count: counts.changes_requested,
      tone: "bg-rose text-rose-foreground",
    },
  ];

  const filtered = React.useMemo(() => {
    if (filter === "all") return approvals;
    return approvals.filter((a) => a.status === filter);
  }, [approvals, filter]);

  function openDecision(approval: Approval, mode: DecisionMode) {
    setDecision({ approval, mode });
  }

  function closeDecision() {
    setDecision({ approval: null, mode: null });
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <HeaderSkeleton />
        <div className="rounded-lg border border-rose/40 bg-rose/20 p-4 text-sm text-rose-foreground">
          Failed to load approvals.
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
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-28 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const subtitle = `${counts.pending} pending · ${counts.approved} approved · ${counts.changes_requested} changes requested`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Decisions queue
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {pills.map((p) => {
          const Icon =
            p.key === "approved"
              ? CheckCircle2
              : p.key === "changes_requested"
                ? MessageSquarePlus
                : p.key === "pending"
                  ? Inbox
                  : RotateCcw;
          const isActive = filter === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors " +
                (isActive
                  ? `${p.tone} border-transparent`
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground")
              }
              aria-pressed={isActive}
            >
              <Icon className="h-3 w-3" />
              {p.label}
              <span
                className={
                  "ml-1 rounded-full px-1.5 text-[10px] font-mono " +
                  (isActive ? "bg-foreground/15" : "bg-muted text-muted-foreground")
                }
              >
                {p.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyApprovals filter={filter} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {filtered.map((a) => (
              <ApprovalCard key={a.id} approval={a} onDecision={openDecision} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <DecisionDialog
        open={decision.mode !== null && decision.approval !== null}
        onOpenChange={(o) => !o && closeDecision()}
        approval={decision.approval}
        mode={decision.mode ?? "approved"}
      />
    </div>
  );
}

function EmptyApprovals({ filter }: { filter: FilterKey }) {
  const label =
    filter === "all"
      ? "No approvals"
      : filter === "pending"
        ? "No pending approvals"
        : filter === "approved"
          ? "No approved approvals"
          : "No changes requested";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {filter === "all"
            ? "Create an approval from a client's detail page."
            : "Switch filters to see other decisions."}
        </p>
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="h-7 w-44 animate-pulse rounded bg-muted" />
      <div className="h-3 w-72 animate-pulse rounded bg-muted" />
    </div>
  );
}
