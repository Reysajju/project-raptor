"use client";

import * as React from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/components/portal/query-hooks";
import { parseCsv, csvRowsToObjects } from "@/lib/parse-csv";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EXPECTED_HEADERS = ["name", "company", "status", "tags", "email", "phone", "owner email"];

const SAMPLE_CSV = `name,company,status,tags,email,phone,owner email
Acme Corp,Acme,active,enterprise;retail,ops@acme.com,+1 415 555 0100,alex@onboardwithus.com
Globex,globex.com,prospect,smb,founder@globex.com,,
Initech,,paused,,contact@initech.com,,priya@onboardwithus.com`;

export function ImportClientsDialog({ open, onOpenChange }: ImportDialogProps) {
  const qc = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  React.useEffect(() => {
    if (!open) {
      // delay reset so the close animation finishes
      const t = setTimeout(reset, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("CSV is empty");
        setRows([]);
        return;
      }
      const objects = csvRowsToObjects(parsed);
      // Validate: require at least a "name" column
      if (!objects[0] || !("name" in objects[0])) {
        toast.error("CSV must have a 'name' column");
        setRows([]);
        return;
      }
      setRows(objects);
      toast.success(`Parsed ${objects.length} row${objects.length === 1 ? "" : "s"} from ${file.name}`);
    } catch (err) {
      toast.error("Could not parse CSV", { description: (err as Error).message });
      setRows([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const loadSample = () => {
    setResult(null);
    setFileName("sample-clients.csv");
    const parsed = parseCsv(SAMPLE_CSV);
    setRows(csvRowsToObjects(parsed));
    toast.success(`Loaded ${SAMPLE_CSV.split("\\n").length - 1} sample rows`);
  };

  const doImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await apiPost<{ imported: number; skipped: number; errors: string[] }>(
        "/api/portal/clients/import",
        { rows }
      );
      setResult(res);
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} client${res.imported === 1 ? "" : "s"}`);
        qc.invalidateQueries({ queryKey: ["clients"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
      if (res.skipped > 0 && res.imported === 0) {
        toast.error(`All ${res.skipped} row${res.skipped === 1 ? "" : "s"} skipped`);
      }
    } catch (err) {
      toast.error("Import failed", { description: (err as Error).message });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Upload className="h-4 w-4" />
            </span>
            Import clients from CSV
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald/40 bg-emerald/10 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-foreground">
                  Import complete: {result.imported} imported, {result.skipped} skipped
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {result.errors.length} warning{result.errors.length === 1 ? "" : "s"}
                </p>
                <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs scrollbar-thin">
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="font-mono text-muted-foreground">{e}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
                Done
              </Button>
              <Button size="sm" onClick={() => { reset(); }}>
                Import another file
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors",
                rows.length > 0 && "border-emerald/40 bg-emerald/5"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              {fileName ? (
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rows.length} row{rows.length === 1 ? "" : "s"} ready to import
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">Drop a CSV file here</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    or click browse below
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => inputRef.current?.click()}
                >
                  Browse files
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={loadSample}
                >
                  Load sample
                </Button>
              </div>
            </div>

            {/* Header hint */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Expected columns
              </p>
              <div className="flex flex-wrap gap-1">
                {EXPECTED_HEADERS.map((h) => (
                  <Badge key={h} variant="secondary" className="text-[10px] font-mono">
                    {h}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                <span className="font-medium">name</span> is required. Others are optional.
                Duplicate emails/phones are skipped.
              </p>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Preview · first 5 rows
                </p>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr>
                        {EXPECTED_HEADERS.map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-mono text-[10px] text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          {EXPECTED_HEADERS.map((h) => (
                            <td key={h} className="px-2 py-1.5 truncate max-w-[120px]">
                              {r[h] || <span className="text-muted-foreground/40">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    +{rows.length - 5} more row{rows.length - 5 === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                Download template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={doImport}
                disabled={rows.length === 0 || importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Import {rows.length} row{rows.length === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
