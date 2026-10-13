"use client";

import * as React from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Loader2,
  HardDrive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQueryState, apiPost, apiDelete } from "@/components/portal/query-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DriveConnection {
  id: string;
  folderUrl: string;
  folderName: string | null;
  isActive: boolean;
  connectedAt: string;
  lastSyncAt: string | null;
}

export function DriveConnectionsTab() {
  const { data, isLoading } = useQueryState<{ connections: DriveConnection[] }>(
    "drive-connections",
    "/api/portal/settings/drive-connections"
  );
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = React.useState(false);

  const connections = data?.connections ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["drive-connections"] });
  };

  const remove = async (id: string) => {
    try {
      await apiDelete(`/api/portal/settings/drive-connections?id=${id}`);
      toast.success("Folder removed");
      refresh();
    } catch (err) {
      toast.error("Failed to remove", { description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Google Drive</h2>
          <p className="text-sm text-muted-foreground">
            Connect shared Google Drive folders. Files uploaded to the portal can be synced
            to these folders, and files in connected folders appear in the file vault.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add folder
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/50" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">No Drive folders connected</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Paste a shared Google Drive folder link to sync files between the portal and Drive.
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Connect a folder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 surface-highlight"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <HardDrive className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{conn.folderName || "Google Drive folder"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Connected {new Date(conn.connectedAt).toLocaleDateString()}
                  {conn.lastSyncAt && ` · Last sync ${new Date(conn.lastSyncAt).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                <CheckCircle2 className="mr-1 h-2.5 w-2.5 text-emerald-foreground" />
                Active
              </Badge>
              <a
                href={conn.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Open in Google Drive"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { toast.success("Sync started"); refresh(); }} title="Sync now">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-foreground hover:bg-rose/20" onClick={() => remove(conn.id)} title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddDriveFolderDialog open={addOpen} onOpenChange={setAddOpen} onDone={refresh} />
    </div>
  );
}

function AddDriveFolderDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [folderUrl, setFolderUrl] = React.useState("");
  const [folderName, setFolderName] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);

  const reset = () => {
    setFolderUrl("");
    setFolderName("");
  };

  const connect = async () => {
    if (!folderUrl.trim()) {
      toast.error("Folder URL is required");
      return;
    }
    if (!folderUrl.includes("drive.google.com") && !folderUrl.includes("docs.google.com")) {
      toast.error("Please paste a valid Google Drive link");
      return;
    }
    setConnecting(true);
    try {
      await apiPost("/api/portal/settings/drive-connections", {
        folderUrl: folderUrl.trim(),
        folderName: folderName.trim() || undefined,
      });
      toast.success("Drive folder connected");
      onDone();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error("Connection failed", { description: (err as Error).message });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(reset, 200); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base">Connect Google Drive folder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Folder share link</Label>
            <Input
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Open the folder in Google Drive → Share → Copy link
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display name (optional)</Label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Client deliverables"
              className="h-9"
            />
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <p className="mt-0.5">
              Files uploaded to the portal's file vault are synced to this Drive folder.
              Files already in the folder appear in the portal. Edits sync both ways.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={connect} disabled={connecting}>
            {connecting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {connecting ? "Connecting…" : "Connect folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
