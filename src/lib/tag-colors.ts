"use client";

/**
 * Deterministic color assignment for client tags. Hashes the tag name to
 * pick a color from a curated palette so the same tag always gets the same
 * color across sessions. Colors use the semantic palette tokens.
 */

const TAG_COLORS = [
  { name: "violet", bg: "bg-accent/20", text: "text-accent-foreground", dot: "var(--accent)" },
  { name: "emerald", bg: "bg-emerald/20", text: "text-emerald-foreground", dot: "var(--emerald-foreground)" },
  { name: "sky", bg: "bg-sky/20", text: "text-sky-foreground", dot: "var(--sky-foreground)" },
  { name: "amber", bg: "bg-amber/20", text: "text-amber-foreground", dot: "var(--amber-foreground)" },
  { name: "rose", bg: "bg-rose/20", text: "text-rose-foreground", dot: "var(--rose-foreground)" },
];

/** Simple string hash (djb2) → index into the palette. */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Get the color config for a tag name. Deterministic. */
export function getTagColor(tagName: string) {
  const idx = hashString(tagName) % TAG_COLORS.length;
  return TAG_COLORS[idx];
}

/** Get the dot color (CSS variable) for a tag. */
export function getTagDot(tagName: string): string {
  return getTagColor(tagName).dot;
}

export { TAG_COLORS };
