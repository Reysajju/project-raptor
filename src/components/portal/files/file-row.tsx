"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  MoreHorizontal,
  Download,
  Trash2,
  Pencil,
  FolderInput,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNav } from "@/components/portal/nav-store";
import { apiPatch, apiDelete } from "@/components/portal/query-hooks";
import { formatBytes, relativeTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileItem } from "./types";
import { mimeBucket, mimeChipClass } from "./accent";

function FileMimeIcon({ mime }: { mime: string }) {
  switch (mimeBucket(mime)) {
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    case "text":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}

export interface FileRowProps {
  file: FileItem;
  folders: string[];
}

export function FileRow({ file, folders }: FileRowProps) {
  const nav = useNav();
  const qc = useQueryClient();
  const [sharedPending, setSharedPending] = React.useState(false);
  const [editMode, setEditMode] = React.useState<null | "rename" | "move">(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  // Edit form state (used by both rename + move dialogs).
  const [editName, setEditName] = React.useState(file.fileName);
  const [editFolder, setEditFolder] = React.useState(file.folder);

  React.useEffect(() => {
    setEditName(file.fileName);
    setEditFolder(file.folder);
  }, [file.fileName, file.folder]);

  async function handleSharedToggle(next: boolean) {
    setSharedPending(true);
    // Optimistic UI — the Switch is already visually flipped by Radix.
    try {
      await apiPatch(`/api/portal/files/${file.id}`, {
        sharedWithClient: next,
      });
      qc.invalidateQueries({ queryKey: ["files"] });
      toast.success(next ? "Shared with client" : "Hidden from client", {
        description: file.fileName,
      });
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSharedPending(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/api/portal/files/${file.id}`);
      qc.invalidateQueries({ queryKey: ["files"] });
      toast.success("File deleted", { description: file.fileName });
      setDeleteOpen(false);
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      if (editMode === "rename") {
        await apiPatch(`/api/portal/files/${file.id}`, {
          fileName: editName.trim() || file.fileName,
        });
        toast.success("Renamed", { description: editName.trim() });
      } else if (editMode === "move") {
        await apiPatch(`/api/portal/files/${file.id}`, {
          folder: editFolder.trim() || "General",
        });
        toast.success("Moved to folder", {
          description: editFolder.trim() || "General",
        });
      }
      qc.invalidateQueries({ queryKey: ["files"] });
      setEditMode(null);
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setEditSubmitting(false);
    }
  }

  function handleDownloadToast() {
    toast.success("Signed URL generated", {
      description: `${file.fileName} · link copied to clipboard`,
    });
  }

  const client = file.client;
  const project = file.project;
  const uploader = file.uploader;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
    >
      {/* Left: icon + meta */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            mimeChipClass(file.mimeType)
          )}
          aria-hidden
        >
          <FileMimeIcon mime={file.mimeType} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{file.fileName}</p>
            {file.version > 1 && (
              <Badge
                variant="secondary"
                className="bg-accent px-1.5 py-0 font-mono text-[10px] text-accent-foreground"
              >
                v{file.version}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="font-mono">{formatBytes(file.sizeBytes)}</span>
            {client && (
              <>
                <span aria-hidden>·</span>
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => nav.openClient(client.id, "files")}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: client.accentColor ?? "var(--muted-foreground)" }}
                    aria-hidden
                  />
                  {client.name}
                </button>
              </>
            )}
            {project && (
              <>
                <span aria-hidden>/</span>
                <span className="truncate">{project.title}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>{relativeTime(file.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Right: uploader + shared toggle + menu */}
      <div className="flex shrink-0 items-center gap-3">
        {uploader && (
          <div className="hidden items-center gap-1.5 sm:flex" title={uploader.fullName}>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                {initials(uploader.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              {uploader.fullName.split(" ")[0]}
            </span>
          </div>
        )}

        <label
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[11px] text-muted-foreground hover:bg-muted/40"
          title={file.sharedWithClient ? "Shared with client" : "Internal only"}
        >
          <span className="flex items-center gap-1">
            {file.sharedWithClient ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {file.sharedWithClient ? "Shared" : "Internal"}
            </span>
          </span>
          <Switch
            checked={file.sharedWithClient}
            onCheckedChange={handleSharedToggle}
            disabled={sharedPending}
            aria-label={`Toggle shared with client for ${file.fileName}`}
          />
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={`Actions for ${file.fileName}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={handleDownloadToast}>
              <Download className="h-4 w-4" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditMode("rename")}>
              <Pencil className="h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditMode("move")}>
              <FolderInput className="h-4 w-4" /> Move to folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit dialog (rename OR move — same component, switched by editMode). */}
      <Dialog
        open={editMode !== null}
        onOpenChange={(o) => !o && setEditMode(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editMode === "rename" ? "Rename file" : "Move to folder"}
            </DialogTitle>
            <DialogDescription>
              {editMode === "rename"
                ? "Change the file name. The version is not bumped."
                : "Move this file to a different folder. Type a new name to create it."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            {editMode === "rename" ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">File name</Label>
                <Input
                  id="edit-name"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="edit-folder">Folder</Label>
                <Input
                  id="edit-folder"
                  list="edit-folder-list"
                  autoFocus
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  required
                />
                <datalist id="edit-folder-list">
                  {folders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditMode(null)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">
                <span className="font-medium text-foreground">
                  {file.fileName}
                </span>{" "}
                will be permanently removed. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.li>
  );
}
