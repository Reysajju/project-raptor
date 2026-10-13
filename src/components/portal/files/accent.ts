/**
 * Maps a client's `accentColor` string ("violet" | "emerald" | "sky" | ...)
 * to a CSS color value usable for inline-styled dots / borders.
 */
export function accentDot(color?: string | null): string {
  switch (color) {
    case "violet":
      return "var(--primary)";
    case "emerald":
      return "var(--emerald-foreground)";
    case "amber":
      return "var(--amber-foreground)";
    case "rose":
      return "var(--rose-foreground)";
    case "sky":
      return "var(--sky-foreground)";
    default:
      return "var(--muted-foreground)";
  }
}

/** Maps a mime type to one of three presentation buckets. */
export type MimeBucket = "pdf" | "image" | "text" | "other";

export function mimeBucket(mime: string): MimeBucket {
  if (!mime) return "other";
  if (mime === "application/pdf" || mime.includes("pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("xml")) {
    return "text";
  }
  return "other";
}

/** Tailwind class fragments for the mime icon chip. */
export function mimeChipClass(mime: string): string {
  switch (mimeBucket(mime)) {
    case "pdf":
      return "bg-rose/40 text-rose-foreground";
    case "image":
      return "bg-emerald/40 text-emerald-foreground";
    case "text":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
