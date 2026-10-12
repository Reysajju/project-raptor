/**
 * Per-client accent color theming. Each client has an `accentColor` field
 * (violet | emerald | sky | amber | rose). These maps translate that field
 * into CSS variable references so the client's brand color can be applied
 * to headers, dots, gradients, and badges consistently across the app.
 */

export type AccentColor = "violet" | "emerald" | "sky" | "amber" | "rose";

export const ACCENT_COLORS: AccentColor[] = ["violet", "emerald", "sky", "amber", "rose"];

/** Tailwind class fragments for bg+text on a small badge/dot. */
export const ACCENT_BADGE: Record<AccentColor, string> = {
  violet: "bg-accent text-accent-foreground",
  emerald: "bg-emerald text-emerald-foreground",
  sky: "bg-sky text-sky-foreground",
  amber: "bg-amber text-amber-foreground",
  rose: "bg-rose text-rose-foreground",
};

/** Raw CSS variable value for the accent's foreground color (usable in inline styles). */
export const ACCENT_DOT: Record<AccentColor, string> = {
  violet: "var(--accent)",
  emerald: "var(--emerald-foreground)",
  sky: "var(--sky-foreground)",
  amber: "var(--amber-foreground)",
  rose: "var(--rose-foreground)",
};

/** Inline-style gradient for a branded header strip (from accent to transparent). */
export function accentGradient(accent: string): string {
  const dot = (ACCENT_DOT[accent as AccentColor] ?? ACCENT_DOT.violet);
  return `linear-gradient(135deg, color-mix(in srgb, ${dot} 18%, transparent), transparent)`;
}

/** Resolve any client's accentColor (may be string|undefined) to a typed AccentColor. */
export function resolveAccent(accent: string | null | undefined): AccentColor {
  if (accent && ACCENT_COLORS.includes(accent as AccentColor)) {
    return accent as AccentColor;
  }
  return "violet";
}
