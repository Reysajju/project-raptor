"use client";

import * as React from "react";
import {
  Tag as TagIcon,
  Trash2,
  Pencil,
  X,
  Check,
  Users,
  ArrowRight,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryState, apiPost, apiDelete } from "@/components/portal/query-hooks";
import { useNav } from "@/components/portal/nav-store";
import { toast } from "sonner";
import { initials, parseTags } from "@/lib/format";
import { getTagDot } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface TagClient {
  id: string;
  name: string;
  company: string | null;
  accentColor: string;
}

interface TagEntry {
  name: string;
  count: number;
  clients: TagClient[];
}

interface TagsResponse {
  tags: TagEntry[];
  totalTags: number;
  totalClients: number;
}

export function TagsManagerButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        title="Manage client tags"
      >
        <TagIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Tags</span>
      </Button>
      <TagsManagerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function TagsManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useQueryState<TagsResponse>("tags", "/api/portal/tags", { enabled: open });
  const qc = React.useMemo(() => null, []);
  const queryClient = useQueryClientRef();
  const [search, setSearch] = React.useState("");

  const tags = data?.tags ?? [];
  const filtered = React.useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <TagIcon className="h-4 w-4" />
            </span>
            Tag management
            {data && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {data.totalTags} tags · {data.totalClients} clients
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags…"
            className="h-8 pl-8 text-sm"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-muted/50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TagIcon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">
              {search ? "No tags match your search" : "No tags yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              Tags are created when you add them to a client.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <ul className="space-y-1.5 pr-2">
              {filtered.map((tag) => (
                <TagRow key={tag.name} tag={tag} onAfter={() => {
                  queryClient.invalidateQueries({ queryKey: ["tags"] });
                  queryClient.invalidateQueries({ queryKey: ["clients"] });
                }} />
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TagRow({ tag, onAfter }: { tag: TagEntry; onAfter: () => void }) {
  const [renaming, setRenaming] = React.useState(false);
  const [newName, setNewName] = React.useState(tag.name);
  const [deleting, setDeleting] = React.useState(false);
  const nav = useNav();

  const doRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === tag.name) {
      setRenaming(false);
      return;
    }
    try {
      await apiPost("/api/portal/tags", { action: "rename", from: tag.name, to: trimmed });
      toast.success(`Renamed "${tag.name}" → "${trimmed}"`, {
        description: `${tag.count} client${tag.count === 1 ? "" : "s"} affected`,
      });
      setRenaming(false);
      onAfter();
    } catch (err) {
      toast.error("Rename failed", { description: (err as Error).message });
    }
  };

  const doDelete = async () => {
    setDeleting(false);
    try {
      await apiDelete(`/api/portal/tags?name=${encodeURIComponent(tag.name)}`);
      toast.success(`Deleted tag "${tag.name}"`, {
        description: `${tag.count} client${tag.count === 1 ? "" : "s"} affected`,
      });
      onAfter();
    } catch (err) {
      toast.error("Delete failed", { description: (err as Error).message });
    }
  };

  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-card p-2.5">
      {renaming ? (
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doRename();
              if (e.key === "Escape") { setRenaming(false); setNewName(tag.name); }
            }}
            className="h-7 text-xs"
          />
          <Button size="icon" className="h-7 w-7" onClick={doRename} aria-label="Confirm rename">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenaming(false); setNewName(tag.name); }} aria-label="Cancel">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span
            className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs font-medium")}
            style={{ background: `color-mix(in srgb, ${getTagDot(tag.name)} 20%, transparent)`, color: getTagDot(tag.name) }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: getTagDot(tag.name) }}
            />
            {tag.name}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {tag.count}
          </span>

          {/* Client avatars */}
          <div className="flex flex-1 items-center -space-x-1.5">
            {tag.clients.slice(0, 5).map((c) => (
              <Popover key={c.id}>
                <PopoverTrigger asChild>
                  <button
                    className="rounded-full ring-2 ring-background hover:z-10 hover:scale-110 transition-transform"
                    onClick={(e) => { e.stopPropagation(); nav.openClient(c.id); }}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-muted text-[9px]">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2" align="start">
                  <p className="text-xs font-medium">{c.name}</p>
                  {c.company && <p className="text-[10px] text-muted-foreground">{c.company}</p>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-6 w-full justify-start gap-1 text-xs"
                    onClick={() => nav.openClient(c.id)}
                  >
                    Open client <ArrowRight className="h-3 w-3" />
                  </Button>
                </PopoverContent>
              </Popover>
            ))}
            {tag.clients.length > 5 && (
              <span className="ml-2 text-[10px] text-muted-foreground">
                +{tag.clients.length - 5} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setRenaming(true)}
              aria-label={`Rename tag ${tag.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-rose-foreground hover:bg-rose/20"
              onClick={() => setDeleting(true)}
              aria-label={`Delete tag ${tag.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleting(false)}
        >
          <div
            className="max-w-sm rounded-lg border border-border bg-popover p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium">Delete tag "{tag.name}"?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This will remove the tag from {tag.count} client{tag.count === 1 ? "" : "s"}.
              Clients themselves are not affected.
            </p>
            <div className="mt-3 flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleting(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={doDelete}>Delete tag</Button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

// Tiny hook to get the query client without importing it at the top level
// (avoids a circular import with query-hooks).
import { useQueryClient } from "@tanstack/react-query";
function useQueryClientRef() {
  return useQueryClient();
}
