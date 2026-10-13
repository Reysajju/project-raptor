"use client";

/**
 * Shared types + small helpers for the Projects Kanban feature.
 * Kept local to /projects so we don't leak project-specific types into other
 * feature folders.
 */

export type Stage = "To Do" | "In Progress" | "Review" | "Done";

export const STAGES: Stage[] = ["To Do", "In Progress", "Review", "Done"];

/** Stage → dot color token (matches design guideline). */
export const stageDot: Record<Stage, string> = {
  "To Do": "var(--sky-foreground)",
  "In Progress": "var(--primary)",
  Review: "var(--amber-foreground)",
  Done: "var(--emerald-foreground)",
};

/** Task status → dot color token. */
export const taskDot: Record<string, string> = {
  todo: "var(--sky-foreground)",
  in_progress: "var(--primary)",
  review: "var(--amber-foreground)",
  done: "var(--emerald-foreground)",
};

export const taskStatusLabels: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

/**
 * Maps a stage drop target → the project status we should PATCH alongside the
 * new stage. The /api/portal/projects/[id] route writes a system event when
 * stage or status change, and the GET route re-derives the bucket from
 * (stage,status), so this keeps the board state in sync after refresh.
 */
export function stageToStatus(stage: Stage): string {
  switch (stage) {
    case "To Do":
      return "planning";
    case "In Progress":
      return "active";
    case "Review":
      return "review";
    case "Done":
      return "done";
  }
}

export interface ProjectAssignee {
  id: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  position: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: string; // todo | in_progress | review | done
  dueDate: string | null;
  position: number;
  assigneeId?: string | null;
  assignee?: ProjectAssignee | null;
}

export interface ProjectFileLite {
  id: string;
  fileName: string;
  mimeType?: string | null;
}

export interface ProjectClientLite {
  id: string;
  name: string;
  company?: string | null;
  accentColor: string;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  status: string;
  stage: string;
  dueDate: string | null;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  client: ProjectClientLite;
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  files: ProjectFileLite[];
}

export interface ProjectsResponse {
  projects: Project[];
  byStage: Record<Stage, Project[]>;
}

export interface ClientLite {
  id: string;
  name: string;
  company?: string | null;
  status?: string;
  accentColor?: string;
}

export interface ClientsResponse {
  clients: ClientLite[];
}

/** Returns ms until due (negative = overdue). */
export function dueMs(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const d = new Date(dueDate).getTime();
  if (Number.isNaN(d)) return null;
  return d - Date.now();
}

/** Returns days (rounded) until due — negative = overdue. */
export function dueDays(dueDate: string | null | undefined): number | null {
  const ms = dueMs(dueDate);
  if (ms === null) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export type DueTone = "overdue" | "soon" | "normal";

/** Classifies a due date for color treatment. */
export function dueTone(dueDate: string | null | undefined): DueTone {
  const days = dueDays(dueDate);
  if (days === null) return "normal";
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "normal";
}

export const dueToneClass: Record<DueTone, string> = {
  overdue: "text-rose-foreground",
  soon: "text-amber-foreground",
  normal: "text-muted-foreground",
};

/** Returns assignees (deduped) from a project's tasks. */
export function collectAssignees(project: Project): ProjectAssignee[] {
  const seen = new Map<string, ProjectAssignee>();
  for (const t of project.tasks) {
    const a = t.assignee;
    if (a && !seen.has(a.id)) seen.set(a.id, a);
  }
  return Array.from(seen.values());
}

/** Counts tasks per status for the small dots row. */
export function countTasksByStatus(
  tasks: ProjectTask[]
): Record<string, number> {
  const out: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };
  for (const t of tasks) {
    if (out[t.status] === undefined) out[t.status] = 0;
    out[t.status]++;
  }
  return out;
}

/** Milestone progress (completed / total). */
export function milestoneProgress(
  milestones: ProjectMilestone[]
): { completed: number; total: number; pct: number } {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, pct };
}

/** Maps an accentColor token to a CSS color (for client dot). */
export function accentDot(color?: string): string {
  switch (color) {
    case "violet":
      return "var(--primary)";
    case "emerald":
      return "var(--emerald-foreground)";
    case "amber":
      return "var(--amber-foreground)";
    case "sky":
      return "var(--sky-foreground)";
    case "rose":
      return "var(--rose-foreground)";
    default:
      return "var(--muted-foreground)";
  }
}
