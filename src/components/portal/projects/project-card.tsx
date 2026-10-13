"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";
import { Calendar, GripVertical, Paperclip, ListChecks } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { initials, shortTime } from "@/lib/format";
import { StatusBadge } from "../common/status-badge";

import {
  type Project,
  type Stage,
  accentDot,
  collectAssignees,
  countTasksByStatus,
  dueToneClass,
  dueDays,
  milestoneProgress,
  taskDot,
} from "./types";

interface ProjectCardProps {
  project: Project;
  stage: Stage;
  onClick: () => void;
}

/**
 * The card itself. Rendered the same way inside the SortableContext and the
 * DragOverlay so the overlay lines up perfectly with the in-place card.
 *
 * Click handling is passed via props so the parent (SortableProjectCard) can
 * suppress the click after a drag gesture.
 */
export function ProjectCard({
  project,
  stage,
  onClick,
}: ProjectCardProps) {
  const reduced = useReducedMotion();
  const assignees = collectAssignees(project);
  const byStatus = countTasksByStatus(project.tasks);
  const progress = milestoneProgress(project.milestones);
  const days = dueDays(project.dueDate);

  const clientDot = accentDot(project.client?.accentColor);
  const stageDotColor = stageDotColorFor(stage);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open project ${project.title}`}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3 surface-highlight cursor-pointer",
        "transition-all hover:border-primary/30 hover:shadow-sm",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        reduced ? "" : "hover:-translate-y-0.5"
      )}
    >
      {/* Drag handle affordance (visible on hover). The whole card is draggable
          but the grip gives a clear hint. */}
      <span
        className="drag-handle pointer-events-none absolute right-2 top-2 hidden h-6 w-4 items-center text-muted-foreground/60 group-hover:flex"
        aria-hidden
        title="Drag to move"
      >
        <GripVertical className="h-4 w-4" />
      </span>

      {/* Header: client dot + title */}
      <div className="flex items-start gap-2 pr-6">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ background: clientDot }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {project.title}
          </p>
          <p
            className="mt-0.5 truncate text-[11px] text-muted-foreground"
            title={project.client?.name}
          >
            {project.client?.name}
            {project.client?.company ? ` · ${project.client.company}` : ""}
          </p>
        </div>
      </div>

      {/* Badges: status + stage */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={project.status} />
        <Badge
          variant="outline"
          className="rounded-full border-transparent px-2 py-0 text-[11px] font-medium uppercase tracking-wide"
          style={{ color: stageDotColor }}
        >
          <span
            className="mr-1 h-1.5 w-1.5 rounded-full"
            style={{ background: stageDotColor }}
            aria-hidden
          />
          {stage}
        </Badge>
      </div>

      {/* Milestone progress */}
      {progress.total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" /> Milestones
            </span>
            <span className="font-mono tabular">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Task status dots */}
      <div className="mt-2 flex items-center gap-1.5">
        {(["todo", "in_progress", "review", "done"] as const).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
            title={`${s}: ${byStatus[s] ?? 0}`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: taskDot[s] }}
              aria-hidden
            />
            <span className="font-mono tabular">{byStatus[s] ?? 0}</span>
          </span>
        ))}
      </div>

      {/* Footer: due date + assignees + files */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {project.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              dueToneClassForDue(days)
            )}
            title={`Due ${shortTime(project.dueDate)}`}
          >
            <Calendar className="h-3 w-3" />
            {formatDueLabel(days)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">No due date</span>
        )}

        <div className="flex items-center gap-2">
          {/* Files chip */}
          {project.files.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span className="font-mono tabular">{project.files.length}</span>
            </span>
          )}

          {/* Assignees (deduped, stacked avatars) */}
          {assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 3).map((a) => (
                <Avatar
                  key={a.id}
                  className="h-5 w-5 border border-card ring-1 ring-border"
                >
                  <AvatarFallback className="bg-muted text-[9px] font-medium text-foreground">
                    {initials(a.fullName) || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-muted text-[9px] font-medium text-muted-foreground ring-1 ring-border">
                  +{assignees.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Sortable wrapper. Renders ProjectCard and wires dnd-kit's useSortable so the
 * card can be dragged. The actual card content lives in <ProjectCard/> so we
 * can also render it inside <DragOverlay/>.
 *
 * Click suppression: when a drag just ended (within ~300ms) we swallow the
 * next click so opening the detail sheet doesn't fire after a move gesture.
 */
export function SortableProjectCard({
  project,
  stage,
  onClick,
  isOverlay,
}: ProjectCardProps & { isOverlay?: boolean }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: { type: "project", stage, project },
  });

  // Track whether a drag has just finished so we can suppress the click that
  // would otherwise open the detail sheet. dnd-kit's isDragging goes false the
  // moment the drag ends, but the trailing click fires a few ms later, so we
  // keep a short "just dragged" window.
  const justDraggedRef = React.useRef(false);
  React.useEffect(() => {
    if (isDragging) {
      justDraggedRef.current = true;
    } else if (justDraggedRef.current) {
      const t = window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 250);
      return () => window.clearTimeout(t);
    }
  }, [isDragging]);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: transition || undefined,
  };

  const wrappedOnClick = React.useCallback(() => {
    if (justDraggedRef.current) {
      return;
    }
    onClick();
  }, [onClick]);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={isOverlay ? false : { opacity: 0, y: 4 }}
      animate={
        isOverlay
          ? { scale: 1.05, opacity: 1 }
          : isDragging
            ? { opacity: 0.5, scale: 0.98 }
            : { opacity: 1, scale: 1, y: 0 }
      }
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={cn(
        "touch-none",
        isOverlay && "cursor-grabbing scale-105 shadow-lg ring-2 ring-primary/40"
      )}
    >
      <ProjectCard project={project} stage={stage} onClick={wrappedOnClick} />
    </motion.div>
  );
}

function stageDotColorFor(stage: Stage): string {
  switch (stage) {
    case "To Do":
      return "var(--sky-foreground)";
    case "In Progress":
      return "var(--primary)";
    case "Review":
      return "var(--amber-foreground)";
    case "Done":
      return "var(--emerald-foreground)";
  }
}

function dueToneClassForDue(days: number | null): string {
  if (days === null) return dueToneClass.normal;
  if (days < 0) return dueToneClass.overdue;
  if (days <= 3) return dueToneClass.soon;
  return dueToneClass.normal;
}

function formatDueLabel(days: number | null): string {
  if (days === null) return "No due date";
  if (days === 0) return "Due today";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}
