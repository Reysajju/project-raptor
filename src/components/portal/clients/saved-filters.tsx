"use client";

import * as React from "react";
import { Bookmark, BookmarkPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePersistentState } from "@/lib/use-persistent-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SavedFilter {
  id: string;
  name: string;
  search: string;
  filter: string;
  sort: string;
  createdAt: string;
}

interface SavedFiltersProps {
  currentSearch: string;
  currentFilter: string;
  currentSort: string;
  onApply: (preset: SavedFilter) => void;
}

export function SavedFiltersBar({
  currentSearch,
  currentFilter,
  currentSort,
  onApply,
}: SavedFiltersProps) {
  const [presets, setPresets] = usePersistentState<SavedFilter[]>(
    "portal:clients:savedFilters",
    []
  );
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const isCurrentSaved = presets.some(
    (p) =>
      p.search === currentSearch &&
      p.filter === currentFilter &&
      p.sort === currentSort &&
      (currentSearch || currentFilter !== "all")
  );

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!currentSearch && currentFilter === "all") {
      toast.error("Set a search or filter before saving");
      return;
    }
    const preset: SavedFilter = {
      id: `preset-${Date.now()}`,
      name: trimmed,
      search: currentSearch,
      filter: currentFilter,
      sort: currentSort,
      createdAt: new Date().toISOString(),
    };
    setPresets([...presets, preset]);
    setName("");
    setSaveOpen(false);
    toast.success(`Saved preset "${trimmed}"`);
  };

  const remove = (id: string) => {
    setPresets(presets.filter((p) => p.id !== id));
    toast.success("Preset deleted");
  };

  if (presets.length === 0 && !saveOpen) {
    return (
      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            disabled={!currentSearch && currentFilter === "all"}
            title="Save current search + filter as a preset"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Save preset
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <Label className="text-[11px] text-muted-foreground">Preset name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setSaveOpen(false); setName(""); }
            }}
            placeholder="e.g. Active enterprise clients"
            className="mt-1.5 h-8 text-xs"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={!name.trim()}>Save</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((p) => {
        const isActive =
          p.search === currentSearch &&
          p.filter === currentFilter &&
          p.sort === currentSort;
        return (
          <div
            key={p.id}
            className={cn(
              "group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              isActive
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            <button
              onClick={() => onApply(p)}
              className="inline-flex items-center gap-1"
              title={`Apply: search="${p.search || "—"}", filter=${p.filter}, sort=${p.sort}`}
            >
              <Bookmark className="h-2.5 w-2.5" />
              {p.name}
            </button>
            <button
              onClick={() => remove(p.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Delete preset ${p.name}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}

      {/* Save current */}
      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
            disabled={!currentSearch && currentFilter === "all"}
            title="Save current search + filter as a preset"
          >
            <BookmarkPlus className="h-3 w-3" />
            Save
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <Label className="text-[11px] text-muted-foreground">Preset name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setSaveOpen(false); setName(""); }
            }}
            placeholder="e.g. Active enterprise clients"
            className="mt-1.5 h-8 text-xs"
          />
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            Search: "{currentSearch || "—"}" · Filter: {currentFilter} · Sort: {currentSort}
          </div>
          <div className="mt-2 flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={save} disabled={!name.trim()}>Save</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
