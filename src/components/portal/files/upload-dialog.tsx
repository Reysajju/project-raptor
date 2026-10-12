"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/portal/user-store";
import { apiPost, useQueryState } from "@/components/portal/query-hooks";
import type {
  ClientsResponse,
  ProjectsResponse,
} from "./types";

export interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing folders, derived from the live files list. */
  folders: string[];
  /** A preselected client id (when invoked from a client-scoped context). */
  defaultClientId?: string | null;
  /** A preselected project id. */
  defaultProjectId?: string | null;
  /** A prefilled file name (e.g. from drag-and-drop). */
  defaultFileName?: string | null;
  /** A prefilled folder name. */
  defaultFolder?: string | null;
}

/**
 * Parses a human file-size string like "1.2 MB", "482 KB", "3000000" into bytes.
 * Falls back to 0 on garbage input.
 */
function parseSizeBytes(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const m = trimmed.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!m) {
    const n = Number(trimmed.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return 0;
  const unit = (m[2] ?? "B").toLowerCase();
  const mult: Record<string, number> = {
    b: 1,
    kb: 1024,
    kib: 1024,
    mb: 1024 * 1024,
    mib: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    gib: 1024 * 1024 * 1024,
  };
  return Math.max(0, Math.floor(num * (mult[unit] ?? 1)));
}

function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

export function UploadDialog({
  open,
  onOpenChange,
  folders,
  defaultClientId,
  defaultProjectId,
  defaultFileName,
  defaultFolder,
}: UploadDialogProps) {
  const user = useCurrentUser((s) => s.user);
  const qc = useQueryClient();
  const { data: clientsData } = useQueryState<ClientsResponse>(
    "clients",
    "/api/portal/clients",
    { enabled: open }
  );
  const { data: projectsData } = useQueryState<ProjectsResponse>(
    "projects",
    "/api/portal/projects",
    { enabled: open }
  );

  const [fileName, setFileName] = React.useState("");
  const [folder, setFolder] = React.useState("");
  const [clientId, setClientId] = React.useState<string>("");
  const [projectId, setProjectId] = React.useState<string>("__none__");
  const [shared, setShared] = React.useState(false);
  const [sizeInput, setSizeInput] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Reset form whenever the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setFileName(defaultFileName ?? "");
    setFolder(defaultFolder ?? "General");
    setClientId(defaultClientId ?? clientsData?.clients[0]?.id ?? "");
    setProjectId(defaultProjectId ? String(defaultProjectId) : "__none__");
    setShared(false);
    setSizeInput("");
  }, [open, defaultFileName, defaultFolder, defaultClientId, defaultProjectId, clientsData]);

  // Reset project selection when the client changes.
  React.useEffect(() => {
    setProjectId("__none__");
  }, [clientId]);

  if (!open) return null;

  const clients = clientsData?.clients ?? [];
  const projects = (projectsData?.projects ?? []).filter(
    (p) => !clientId || p.clientId === clientId
  );

  const canSubmit =
    fileName.trim().length > 0 && clientId.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const sizeBytes = parseSizeBytes(sizeInput);
      await apiPost("/api/portal/files", {
        clientId,
        projectId: projectId && projectId !== "__none__" ? projectId : null,
        folder: folder.trim() || "General",
        fileName: fileName.trim(),
        mimeType: guessMimeFromName(fileName),
        sizeBytes,
        uploadedById: user?.id ?? null,
        sharedWithClient: shared,
      });
      qc.invalidateQueries({ queryKey: ["files"] });
      toast.success("File uploaded", { description: fileName.trim() });
      onOpenChange(false);
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload file
          </DialogTitle>
          <DialogDescription>
            Mock upload — no real bytes are stored. Version is auto-bumped if a
            file with the same name exists in the same client + folder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upload-filename">File name</Label>
            <Input
              id="upload-filename"
              autoFocus
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="report-Q3-final.pdf"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upload-folder">Folder</Label>
            <Input
              id="upload-folder"
              list="upload-folder-list"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="General"
            />
            <datalist id="upload-folder-list">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full" aria-label="Select client">
                  <SelectValue placeholder="Pick a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` · ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
                disabled={projects.length === 0}
              >
                <SelectTrigger className="w-full" aria-label="Select project">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="upload-size">File size</Label>
              <Input
                id="upload-size"
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                placeholder="e.g. 1.2 MB or 482000"
              />
              <p className="text-[11px] text-muted-foreground">
                Parsed:{" "}
                <span className="font-mono">
                  {parseSizeBytes(sizeInput).toLocaleString()} B
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upload-shared" className="mb-1">
                Shared with client
              </Label>
              <div className="flex h-9 items-center gap-2">
                <Switch
                  id="upload-shared"
                  checked={shared}
                  onCheckedChange={setShared}
                  aria-label="Share with client"
                />
                <span className="text-xs text-muted-foreground">
                  {shared ? "Visible in portal" : "Internal only"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
