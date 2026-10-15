"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  File as FileIcon,
  Calendar,
  Users,
  ListChecks,
  Paperclip,
  Plus,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost, useQueryState } from "../query-hooks";
import { useNav } from "../nav-store";
import { StatusBadge } from "../common/status-badge";
import {
  initials,
  relativeTime,
  shortTime,
  formatBytes,
} from "@/lib/format";

import {
  type Project,
  type ProjectMilestone,
  type Stage,
  accentDot,
  dueToneClass,
  dueDays,
  taskStatusLabels,
  taskDot,
} from "./types";

interface ProjectDetailSheetProps {
  projectId: string | null;
  stage?: Stage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FullProject extends Project {
  files: {
    id: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes?: number | null;
    folder?: string | null;
    createdAt?: string | null;
    sharedWithClient?: boolean | null;
  }[];
}

export function ProjectDetailSheet({
  projectId,
  stage,
  open,
  onOpenChange,
}: ProjectDetailSheetProps) {
  const qc = useQueryClient();
  const nav = useNav();

  // Fetch the full project (with all tasks/files/milestones). The list endpoint
  // returns the same data, but we re-fetch on open so the detail sheet always
  // shows fresh state after a task PATCH.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () =>
      apiGet<{ project: FullProject }>(`/api/portal/projects/${projectId}`),
    enabled: !!projectId && open,
  });

  const project = data?.project;

  // Optimistic, local copy of tasks so toggling a status updates the dots row
  // and the detail list instantly.
  const [localTasks, setLocalTasks] = React.useState<
    | { id: string; title: string; status: string; dueDate: string | null; assignee?: { id: string; fullName: string } | null }[]
    | null
  >(null);

  // Optimistic local copy of milestone completed flags (no endpoint exists).
  const [localMilestones, setLocalMilestones] = React.useState<
    ProjectMilestone[] | null
  >(null);

  React.useEffect(() => {
    setLocalTasks(null);
    setLocalMilestones(null);
  }, [projectId]);

  React.useEffect(() => {
    if (project) {
      if (!localTasks) {
        setLocalTasks(
          project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate,
            assignee: t.assignee
              ? { id: t.assignee.id, fullName: t.assignee.fullName }
              : null,
          }))
        );
      }
      if (!localMilestones) {
        setLocalMilestones(project.milestones);
      }
    }
  }, [project, localTasks, localMilestones]);

  // PATCH a task's status. Optimistic update + rollback on error.
  const patchTaskStatus = React.useCallback(
    async (taskId: string, next: string) => {
      if (!localTasks) return;
      const prev = localTasks;
      setLocalTasks(
        prev.map((t) => (t.id === taskId ? { ...t, status: next } : t))
      );
      try {
        await apiPatch(`/api/portal/tasks/${taskId}`, { status: next });
        toast.success("Task updated", {
          description: `Status set to ${taskStatusLabels[next] ?? next}`,
        });
        // Invalidate so the board's task dots re-fetch.
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["project", projectId] });
      } catch (err) {
        setLocalTasks(prev);
        toast.error("Failed to update task", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [localTasks, projectId, qc]
  );

  const { data: teamData } = useQueryState<{ team: Array<{ id: string; fullName: string; role: string; email: string }> }>("team", "/api/portal/team");
  const team = teamData?.team ?? [];

  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [newTaskAssignee, setNewTaskAssignee] = React.useState("");
  const [creatingTask, setCreatingTask] = React.useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;
    setCreatingTask(true);
    try {
      await apiPost("/api/portal/tasks", {
        projectId,
        title: newTaskTitle.trim(),
        assigneeId: newTaskAssignee || null,
        status: "todo",
      });
      toast.success(`Task "${newTaskTitle.trim()}" added.`);
      setNewTaskTitle("");
      setNewTaskAssignee("");
      refetch();
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      toast.error("Failed to add task", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const patchTaskAssignee = React.useCallback(
    async (taskId: string, assigneeId: string | null) => {
      if (!localTasks) return;
      const targetMember = team.find((m) => m.id === assigneeId);
      const prev = localTasks;
      setLocalTasks(
        prev.map((t) =>
          t.id === taskId
            ? { ...t, assignee: targetMember ? { id: targetMember.id, fullName: targetMember.fullName } : null }
            : t
        )
      );
      try {
        await apiPatch(`/api/portal/tasks/${taskId}`, { assigneeId: assigneeId || null });
        toast.success("Assignee updated");
        qc.invalidateQueries({ queryKey: ["projects"] });
        qc.invalidateQueries({ queryKey: ["project", projectId] });
      } catch (err) {
        setLocalTasks(prev);
        toast.error("Failed to update assignee", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [localTasks, projectId, qc, team]
  );

  // Milestone toggle — optimistic-only (no endpoint exists for now).
  // TODO: when /api/portal/milestones/[id] lands, replace the optimistic toggle
  // with a real PATCH call.
  const toggleMilestone = React.useCallback(
    (milestoneId: string) => {
      if (!localMilestones) return;
      setLocalMilestones(
        localMilestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        )
      );
    },
    [localMilestones]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl flex flex-col"
      >
        <SheetHeader>
          {isLoading || !project ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 pr-8">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: accentDot(project.client?.accentColor) }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base leading-tight">
                    {project.title}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5">
                    <button
                      className="hover:underline"
                      onClick={() =>
                        project.client && nav.openClient(project.client.id)
                      }
                    >
                      {project.client?.name}
                      {project.client?.company
                        ? ` · ${project.client.company}`
                        : ""}
                    </button>
                    {stage && (
                      <>
                        {" · "}
                        <span>{stage}</span>
                      </>
                    )}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={project.status} />
                {project.dueDate && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px]",
                      dueToneClass[dueToneClassKey(dueDays(project.dueDate))]
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    Due {shortTime(project.dueDate)}
                  </span>
                )}
              </div>
            </>
          )}
        </SheetHeader>

        {error ? (
          <div className="m-4 rounded-md border border-rose/60 bg-rose/30 p-3 text-sm text-rose-foreground">
            <p className="font-medium">Failed to load project</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : isLoading || !project ? (
          <DetailSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-6">
            {/* Milestones */}
            <section className="mt-4">
              <SectionHeader
                icon={<ListChecks className="h-3.5 w-3.5" />}
                title="Milestones"
                count={
                  localMilestones
                    ? localMilestones.length
                    : project.milestones.length
                }
              />
              <div className="mt-2 space-y-1">
                {(localMilestones ?? project.milestones).map((m) => {
                  const days = dueDays(m.dueDate);
                  const tone = dueToneClassKey(days);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2.5 surface-highlight"
                    >
                      <Checkbox
                        checked={m.completed}
                        onCheckedChange={() => toggleMilestone(m.id)}
                        aria-label={`Mark milestone ${m.title} as ${
                          m.completed ? "incomplete" : "complete"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm",
                            m.completed && "text-muted-foreground line-through"
                          )}
                        >
                          {m.title}
                        </p>
                        {m.dueDate && (
                          <p
                            className={cn(
                              "mt-0.5 text-[11px]",
                              dueToneClass[tone]
                            )}
                          >
                            Due {shortTime(m.dueDate)}
                            {typeof days === "number" && days < 0
                              ? ` · ${Math.abs(days)}d overdue`
                              : typeof days === "number" && days <= 3
                                ? ` · in ${days}d`
                                : ""}
                          </p>
                        )}
                      </div>
                      {m.completed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-foreground" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      )}
                    </div>
                  );
                })}
                {(localMilestones ?? project.milestones).length === 0 && (
                  <EmptyRow text="No milestones yet" />
                )}
              </div>
            </section>

            {/* Tasks grouped by status */}
            <section className="mt-6">
              <SectionHeader
                icon={<Users className="h-3.5 w-3.5" />}
                title="Tasks"
                count={
                  localTasks ? localTasks.length : project.tasks.length
                }
              />

              {/* Quick Add Task Form */}
              <form onSubmit={handleCreateTask} className="mt-2.5 flex items-center gap-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a new task…"
                  className="h-8 text-xs flex-1"
                />
                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Assignee (opt)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {team.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  type="submit"
                  disabled={creatingTask || !newTaskTitle.trim()}
                  className="h-8 text-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </form>

              <div className="mt-2 space-y-3">
                {(["todo", "in_progress", "review", "done"] as const).map(
                  (status) => {
                    const items = (localTasks ?? []).filter(
                      (t) => t.status === status
                    );
                    if (items.length === 0) return null;
                    return (
                      <div key={status}>
                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: taskDot[status] }}
                            aria-hidden
                          />
                          {taskStatusLabels[status]} ({items.length})
                        </p>
                        <div className="space-y-1">
                          {items.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 rounded-md border border-border bg-card p-2 surface-highlight"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">{t.title}</p>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  {t.dueDate && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1",
                                        dueToneClass[
                                          dueToneClassKey(dueDays(t.dueDate))
                                        ]
                                      )}
                                    >
                                      <Calendar className="h-3 w-3" />
                                      {shortTime(t.dueDate)}
                                    </span>
                                  )}
                                  <Select
                                    value={t.assignee?.id ?? "unassigned"}
                                    onValueChange={(val) =>
                                      patchTaskAssignee(
                                        t.id,
                                        val === "unassigned" ? null : val
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-5 px-1.5 py-0 text-[10px] gap-1 border-dashed border-border bg-muted/30 hover:bg-muted text-muted-foreground w-auto">
                                      {t.assignee ? (
                                        <span className="inline-flex items-center gap-1 text-foreground">
                                          <Avatar className="h-3 w-3">
                                            <AvatarFallback className="bg-primary/20 text-[7px] text-primary">
                                              {initials(t.assignee.fullName) || "?"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="truncate max-w-[80px]">
                                            {t.assignee.fullName}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Unassigned</SelectItem>
                                      {team.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {m.fullName} ({m.role})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Select
                                value={t.status}
                                onValueChange={(v) =>
                                  patchTaskStatus(t.id, v)
                                }
                              >
                                <SelectTrigger
                                  size="sm"
                                  className="h-7 w-[120px] shrink-0 text-xs"
                                  aria-label={`Set status for ${t.title}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(
                                    [
                                      "todo",
                                      "in_progress",
                                      "review",
                                      "done",
                                    ] as const
                                  ).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      <span
                                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                                        style={{ background: taskDot[s] }}
                                      />
                                      {taskStatusLabels[s]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
                {project.tasks.length === 0 && (
                  <EmptyRow text="No tasks yet" />
                )}
              </div>
            </section>

            {/* Files */}
            <section className="mt-6">
              <SectionHeader
                icon={<Paperclip className="h-3.5 w-3.5" />}
                title="Files"
                count={project.files.length}
              />
              <div className="mt-2 space-y-1">
                {project.files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2 surface-highlight"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <FileIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{f.fileName}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {f.mimeType || "file"}
                        {typeof f.sizeBytes === "number" && f.sizeBytes > 0
                          ? ` · ${formatBytes(f.sizeBytes)}`
                          : ""}
                        {f.folder ? ` · ${f.folder}` : ""}
                      </p>
                    </div>
                    {f.sharedWithClient && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-transparent bg-emerald text-emerald-foreground text-[10px] px-2 py-0"
                      >
                        Shared
                      </Badge>
                    )}
                  </div>
                ))}
                {project.files.length === 0 && (
                  <EmptyRow text="No files attached" />
                )}
              </div>
            </section>

            {/* Footer: updated */}
            <p className="mt-6 text-[11px] text-muted-foreground">
              {project.updatedAt
                ? `Last updated ${relativeTime(project.updatedAt)}`
                : ""}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <h3 className="text-sm font-medium">{title}</h3>
      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex-1 space-y-3 px-4 pb-6">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function dueToneClassKey(days: number | null): "overdue" | "soon" | "normal" {
  if (days === null) return "normal";
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "normal";
}
