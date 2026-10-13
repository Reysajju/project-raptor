"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { apiPost, useQueryState } from "../query-hooks";
import { StatusBadge } from "../common/status-badge";

import { type ClientsResponse, type Stage, STAGES } from "./types";

interface NewProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAGE_OPTIONS: Stage[] = STAGES;

export function NewProjectSheet({
  open,
  onOpenChange,
}: NewProjectSheetProps) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQueryState<ClientsResponse>(
    "clients",
    "/api/portal/clients",
    { enabled: open }
  );

  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [stage, setStage] = React.useState<Stage>("To Do");
  const [dueDate, setDueDate] = React.useState<Date | undefined>();
  const [milestones, setMilestones] = React.useState<string[]>([""]);
  const [submitting, setSubmitting] = React.useState(false);

  // Reset form when sheet opens
  React.useEffect(() => {
    if (open) {
      setTitle("");
      setClientId("");
      setStage("To Do");
      setDueDate(undefined);
      setMilestones([""]);
      setSubmitting(false);
    }
  }, [open]);

  const clients = data?.clients ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title required", {
        description: "Please name your project before creating it.",
      });
      return;
    }
    if (!clientId) {
      toast.error("Client required", {
        description: "Pick a client to attach this project to.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const cleanedMilestones = milestones
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m) => ({ title: m }));
      await apiPost("/api/portal/projects", {
        clientId,
        title: title.trim(),
        stage,
        status: stageToStatus(stage),
        dueDate: dueDate ? dueDate.toISOString() : null,
        milestones: cleanedMilestones,
      });
      toast.success("Project created", {
        description: `“${title.trim()}” added to ${stage}.`,
      });
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create project", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>New project</SheetTitle>
          <SheetDescription>
            Create a new project on the board. Tasks and milestones can be
            refined later from the project detail sheet.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4"
        >
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="np-title">Project title</Label>
              <Input
                id="np-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Renewal 2025"
                autoFocus
                required
                maxLength={120}
              />
            </div>

            {/* Client select */}
            <div className="space-y-1.5">
              <Label htmlFor="np-client">Client</Label>
              {error ? (
                <div className="rounded-md border border-rose/60 bg-rose/30 p-2 text-xs text-rose-foreground">
                  Failed to load clients: {String(error)}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 h-6 text-[10px]"
                    onClick={() =>
                      qc.invalidateQueries({ queryKey: ["clients"] })
                    }
                  >
                    Retry
                  </Button>
                </div>
              ) : isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : clients.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No clients yet. Create one first.
                </p>
              ) : (
                <Select
                  value={clientId}
                  onValueChange={setClientId}
                  required
                >
                  <SelectTrigger id="np-client" className="w-full">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.name}
                          {c.company ? (
                            <span className="text-muted-foreground">
                              · {c.company}
                            </span>
                          ) : null}
                          {c.status && <StatusBadge status={c.status} />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Stage select */}
            <div className="space-y-1.5">
              <Label htmlFor="np-stage">Initial stage</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as Stage)}
              >
                <SelectTrigger id="np-stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ background: stageDotColorFor(s) }}
                      />
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date picker */}
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "d MMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => setDueDate(d ?? undefined)}
                    initialFocus
                  />
                  {dueDate && (
                    <div className="flex items-center justify-end gap-2 p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDueDate(undefined)}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            {/* Milestones multi-input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Milestones</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setMilestones((m) => [...m, ""])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add milestone
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Add the major milestones for this project. You can mark them
                complete later.
              </p>
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full bg-muted text-[10px] tabular"
                    >
                      {i + 1}
                    </Badge>
                    <Input
                      value={m}
                      onChange={(e) =>
                        setMilestones((cur) =>
                          cur.map((c, idx) => (idx === i ? e.target.value : c))
                        )
                      }
                      placeholder="e.g. Kickoff call"
                      className="h-8 text-sm"
                    />
                    {milestones.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() =>
                          setMilestones((cur) => cur.filter((_, idx) => idx !== i))
                        }
                        aria-label={`Remove milestone ${i + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).closest(
                "form"
              ) as HTMLFormElement | null;
              if (form) form.requestSubmit();
            }}
            disabled={
              submitting || !title.trim() || !clientId || isLoading
            }
          >
            {submitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Create project
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function stageDotColorFor(stage: Stage): string {
  switch (stage) {
    case "To Do":
      return "var(--sky-foreground)";
    case "In Progress":
      return "var(--primary)";
    case "Review":
      return "var(--amber-foreground)";
    case "Done":
      return "var(--emerald-foreground)";
  }
}

function stageToStatus(stage: Stage): string {
  switch (stage) {
    case "To Do":
      return "planning";
    case "In Progress":
      return "active";
    case "Review":
      return "review";
    case "Done":
      return "done";
  }
}
