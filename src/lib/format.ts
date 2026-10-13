import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from "date-fns";

export function relativeTime(date: Date | string | number): string {
  const d = new Date(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function shortTime(date: Date | string | number): string {
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  if (isThisYear(d)) return format(d, "d MMM");
  return format(d, "dd/MM/yyyy");
}

export function dayDividerLabel(date: Date | string | number): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export type ChannelKind =
  | "email"
  | "sms"
  | "call"
  | "portal"
  | "note"
  | "system";

export interface ChannelMeta {
  label: string;
  color: string; // tailwind text/bg utility fragment for the channel accent
  dot: string; // hex/css color for the dot
}

export const channelMeta: Record<ChannelKind, ChannelMeta> = {
  email: { label: "Email", color: "text-sky-foreground", dot: "var(--sky-foreground)" },
  sms: { label: "SMS", color: "text-emerald-foreground", dot: "var(--emerald-foreground)" },
  call: { label: "Call", color: "text-violet-400 dark:text-violet-300", dot: "#a78bfa" },
  portal: { label: "Portal", color: "text-amber-foreground", dot: "var(--amber-foreground)" },
  note: { label: "Note", color: "text-muted-foreground", dot: "var(--muted-foreground)" },
  system: { label: "System", color: "text-muted-foreground", dot: "var(--muted-foreground)" },
};

export type StatusKind =
  | "open"
  | "snoozed"
  | "done"
  | "pending"
  | "approved"
  | "changes_requested"
  | "active"
  | "prospect"
  | "churned"
  | "paused"
  | "planning"
  | "review";

export const statusMeta: Record<string, { label: string; tone: "neutral" | "emerald" | "amber" | "rose" | "sky" | "violet" }> = {
  open: { label: "Open", tone: "sky" },
  snoozed: { label: "Snoozed", tone: "amber" },
  done: { label: "Done", tone: "emerald" },
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  changes_requested: { label: "Changes requested", tone: "rose" },
  active: { label: "Active", tone: "emerald" },
  prospect: { label: "Prospect", tone: "sky" },
  churned: { label: "Churned", tone: "rose" },
  paused: { label: "Paused", tone: "amber" },
  planning: { label: "Planning", tone: "sky" },
  review: { label: "In review", tone: "amber" },
  in_progress: { label: "In progress", tone: "violet" },
  todo: { label: "To do", tone: "sky" },
  published: { label: "Published", tone: "emerald" },
  draft: { label: "Draft", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
  submitted: { label: "Submitted", tone: "sky" },
  reviewed: { label: "Reviewed", tone: "emerald" },
  connected: { label: "Connected", tone: "emerald" },
  disconnected: { label: "Disconnected", tone: "neutral" },
  error: { label: "Error", tone: "rose" },
  received: { label: "Received", tone: "sky" },
  processed: { label: "Processed", tone: "emerald" },
  failed: { label: "Failed", tone: "rose" },
};

/** Tailwind class fragments for each tone used by StatusBadge. */
export const toneClasses: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  emerald: "bg-emerald text-emerald-foreground border-transparent",
  amber: "bg-amber text-amber-foreground border-transparent",
  rose: "bg-rose text-rose-foreground border-transparent",
  sky: "bg-sky text-sky-foreground border-transparent",
  violet: "bg-accent text-accent-foreground border-transparent",
};

export function parseTags(tags: string): string[] {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
