"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Search, KanbanSquare, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useQueryState, apiPatch } from "../query-hooks";

import {
  type Project,
  type ProjectsResponse,
  type ClientLite,
  type ClientsResponse,
  type Stage,
  STAGES,
  stageDot,
  stageToStatus,
} from "./types";
import { SortableProjectCard, ProjectCard } from "./project-card";
import { ProjectDetailSheet } from "./project-detail-sheet";
import { NewProjectSheet } from "./new-project-sheet";
import { MilestonesView } from "./milestones-view";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

export function ProjectsView() {
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } =
    useQueryState<ProjectsResponse>("projects", "/api/portal/projects");

  // Fetch clients for the filter dropdown.
  const { data: clientsData } = useQueryState<ClientsResponse>(
    "clients",
    "/api/portal/clients"
  );
  const clients: ClientLite[] = clientsData?.clients ?? [];

  // UI state
  const [view, setView] = React.useState<"board" | "milestones">("board");
  const [clientFilter, setClientFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailStage, setDetailStage] = React.useState<Stage | undefined>(
    undefined
  );
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);

  // Drag state
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  // Apply filters client-side.
  const filteredByStage = React.useMemo<Record<Stage, Project[]>>(() => {
    const empty: Record<Stage, Project[]> = {
      "To Do": [],
      "In Progress": [],
      Review: [],
      Done: [],
    };
    if (!data) return empty;
    const q = search.trim().toLowerCase();
    for (const stage of STAGES) {
      const list = (data.byStage[stage] ?? []).filter((p) => {
        if (clientFilter !== "all" && p.clientId !== clientFilter) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (q && !p.title.toLowerCase().includes(q)) return false;
        return true;
      });
      empty[stage] = list;
    }
    return empty;
  }, [data, search, clientFilter, statusFilter]);

  const totalCount = (data?.projects ?? []).length;
  const activeCount = (data?.projects ?? []).filter(
    (p) => p.status === "active"
  ).length;

  // dnd-kit sensors. Activation distance so a click still works.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      // KeyboardSensor default keys: Space to pick up, Space/Enter to drop,
      // arrows to move, Esc to cancel. Required for a11y on sortable items.
    })
  );

  function openDetail(p: Project, stage: Stage) {
    setDetailId(p.id);
    setDetailStage(stage);
    setDetailOpen(true);
  }

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function handleDragCancel(_: DragCancelEvent) {
    setDraggingId(null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Determine the target stage: either the over item is a column itself
    // (id === stage), or it's a project (look up its stage in the current
    // filteredByStage).
    let targetStage: Stage | null = null;
    if ((STAGES as string[]).includes(overId)) {
      targetStage = overId as Stage;
    } else {
      // Find the project the user hovered over in the current filteredByStage
      for (const s of STAGES) {
        if (filteredByStage[s].some((p) => p.id === overId)) {
          targetStage = s;
          break;
        }
      }
    }
    if (!targetStage) return;

    // Determine source stage from the active.data payload (sortable sets it).
    const sourceStage =
      (active.data.current?.stage as Stage | undefined) ?? null;
    if (!sourceStage) return;

    // Same stage + same project = no-op (we don't persist intra-column order).
    if (sourceStage === targetStage) return;

    // Find the project being moved.
    const project =
      (data?.projects ?? []).find((p) => p.id === activeId) ??
      (active.data.current?.project as Project | undefined);
    if (!project) return;

    // Optimistic update: move the project to the new stage column in the cache
    // and reflect its new stage/status on the card immediately.
    const previousData = qc.getQueryData<ProjectsResponse>(["projects"]);
    if (previousData) {
      const movedStatus = stageToStatus(targetStage);
      const nextProjects = previousData.projects.map((p) =>
        p.id === activeId
          ? { ...p, stage: targetStage, status: movedStatus }
          : p
      );
      const nextByStage: Record<Stage, Project[]> = {
        "To Do": [],
        "In Progress": [],
        Review: [],
        Done: [],
      };
      for (const s of STAGES) {
        // For the moved project: assign to targetStage column. For others:
        // preserve their previous bucket.
        nextByStage[s] = nextProjects.filter((p) => {
          if (p.id === activeId) return targetStage === s;
          return previousData.byStage[s].some((pp) => pp.id === p.id);
        });
      }
      const next: ProjectsResponse = {
        projects: nextProjects,
        byStage: nextByStage,
      };
      qc.setQueryData<ProjectsResponse>(["projects"], next);
    }

    try {
      await apiPatch(`/api/portal/projects/${activeId}`, {
        stage: targetStage,
        status: stageToStatus(targetStage),
      });
      // Refetch to get authoritative ordering + the system event payload.
      await qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project moved", {
        description: `“${project.title}” → ${targetStage}`,
      });
    } catch (err) {
      toast.error("Failed to move project", {
        description: err instanceof Error ? err.message : String(err),
      });
      // Rollback optimistic update.
      if (previousData) {
        qc.setQueryData<ProjectsResponse>(["projects"], previousData);
      }
    }
  }

  // Drag overlay content — render the card without dnd-kit listeners.
  const draggingProject = React.useMemo(() => {
    if (!draggingId || !data) return null;
    const p = data.projects.find((p) => p.id === draggingId);
    if (!p) return null;
    // Determine its stage (post-optimistic).
    let stage: Stage = "To Do";
    for (const s of STAGES) {
      if ((data.byStage[s] ?? []).some((pp) => pp.id === draggingId)) {
        stage = s;
        break;
      }
    }
    return { project: p, stage };
  }, [draggingId, data]);

  if (isLoading) return <BoardSkeleton />;
  if (error) {
    return (
      <div className="rounded-lg border border-rose/60 bg-rose/30 p-6 text-sm text-rose-foreground">
        <p className="font-medium">Failed to load projects</p>
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalCount} project{totalCount === 1 ? "" : "s"} · {activeCount}{" "}
            active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as "board" | "milestones")}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="board" aria-label="Board view">
              <KanbanSquare className="h-3.5 w-3.5" />
              <span className="ml-1 hidden sm:inline">Board</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="milestones" aria-label="Milestones view">
              <ListChecks className="h-3.5 w-3.5" />
              <span className="ml-1 hidden sm:inline">Milestones</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New project
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 surface-highlight">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project title…"
            className="h-8 pl-7 text-sm"
            aria-label="Search projects"
          />
        </div>
        <Select
          value={clientFilter}
          onValueChange={setClientFilter}
        >
          <SelectTrigger size="sm" className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(clientFilter !== "all" || statusFilter !== "all" || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setClientFilter("all");
              setStatusFilter("all");
              setSearch("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Body */}
      {totalCount === 0 ? (
        <EmptyBoard onCreate={() => setNewOpen(true)} />
      ) : view === "milestones" ? (
        <MilestonesView
          projects={(data?.projects ?? []).filter((p) => {
            const q = search.trim().toLowerCase();
            if (clientFilter !== "all" && p.clientId !== clientFilter)
              return false;
            if (statusFilter !== "all" && p.status !== statusFilter)
              return false;
            if (q && !p.title.toLowerCase().includes(q)) return false;
            return true;
          })}
          onProjectClick={(p) => {
            // Determine stage for the detail sheet context.
            let st: Stage = "To Do";
            for (const s of STAGES) {
              if ((data?.byStage[s] ?? []).some((pp) => pp.id === p.id)) {
                st = s;
                break;
              }
            }
            openDetail(p, st);
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Board
            byStage={filteredByStage}
            onOpen={(p, stage) => openDetail(p, stage)}
          />
          <DragOverlay dropAnimation={null}>
            {draggingProject ? (
              <div className="cursor-grabbing scale-105 shadow-lg ring-2 ring-primary/40">
                <ProjectCard
                  project={draggingProject.project}
                  stage={draggingProject.stage}
                  onClick={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Detail sheet */}
      <ProjectDetailSheet
        projectId={detailId}
        stage={detailStage}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) {
            // Clear local state after the sheet closes.
            window.setTimeout(() => {
              setDetailId(null);
              setDetailStage(undefined);
            }, 250);
          }
        }}
      />

      {/* New project sheet */}
      <NewProjectSheet open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

interface BoardProps {
  byStage: Record<Stage, Project[]>;
  onOpen: (p: Project, stage: Stage) => void;
}

function Board({ byStage, onOpen }: BoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin md:grid md:grid-cols-4 md:overflow-visible">
      {STAGES.map((stage) => (
        <Column
          key={stage}
          stage={stage}
          projects={byStage[stage]}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

interface ColumnProps {
  stage: Stage;
  projects: Project[];
  onOpen: (p: Project, stage: Stage) => void;
}

function Column({ stage, projects, onOpen }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: "column", stage },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-card/60 surface-highlight md:w-auto",
        isOver && "border-primary/50 ring-1 ring-primary/30"
      )}
      aria-label={`Column ${stage}`}
    >
      {/* Column header */}
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: stageDot[stage] }}
          aria-hidden
        />
        <h2 className="flex-1 text-sm font-medium">{stage}</h2>
        <Badge
          variant="outline"
          className="rounded-full bg-muted px-1.5 py-0 text-[10px] tabular"
        >
          {projects.length}
        </Badge>
      </header>

      {/* Card list */}
      <div className="max-h-[70vh] flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((p) => (
            <SortableProjectCard
              key={p.id}
              project={p}
              stage={stage}
              onClick={() => onOpen(p, stage)}
            />
          ))}
        </SortableContext>

        {projects.length === 0 && (
          <div
            className={cn(
              "rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground transition-colors",
              isOver && "border-primary/40 text-primary"
            )}
          >
            {isOver ? "Drop project here" : "Drop projects here"}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyBoard({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-12 text-center">
      <KanbanSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-2 text-sm font-medium">No projects yet</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Create your first project to start tracking work on the board.
      </p>
      <Button size="sm" className="mt-3" onClick={onCreate}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> New project
      </Button>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {STAGES.map((s) => (
          <div
            key={s}
            className="rounded-lg border border-border bg-card/40 p-3"
          >
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
