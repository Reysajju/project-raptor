"use client";

import { toast } from "sonner";

/**
 * Trigger a CSV download in the browser from an array of row objects.
 * Escapes cells containing commas, quotes, or newlines per RFC 4180.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const escape = (cell: string | number | null | undefined): string => {
    const c = String(cell ?? "");
    if (c.includes(",") || c.includes('"') || c.includes("\n")) {
      return `"${c.replace(/"/g, '""')}"`;
    }
    return c;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}`, {
    description: a.download,
  });
}
