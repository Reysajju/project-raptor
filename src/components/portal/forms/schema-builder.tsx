"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  FileText,
  AlignLeft,
  ListChecks,
  CheckSquare,
  Calendar as CalendarIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { FIELD_TYPES, type FormField, type FieldType, type ClientLite } from "./types";
import { FormRenderer } from "./form-renderer";

interface SchemaBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing form id when editing, null when creating. */
  formId: string | null;
  initialTitle: string;
  initialDescription: string;
  initialClientId: string | null;
  initialSchema: FormField[];
  initialStatus: string;
  clients: ClientLite[];
  onSave: (input: {
    id: string | null;
    title: string;
    description: string;
    clientId: string | null;
    schema: FormField[];
    status: string;
  }) => Promise<void>;
}

function makeId() {
  return `f_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function blankField(type: FieldType): FormField {
  const base: FormField = {
    id: makeId(),
    type,
    label: "",
    required: false,
  };
  if (type === "select") base.options = ["Option 1", "Option 2"];
  return base;
}

export function SchemaBuilder(props: SchemaBuilderProps) {
  const { open, onOpenChange } = props;
  const [title, setTitle] = React.useState(props.initialTitle);
  const [description, setDescription] = React.useState(props.initialDescription);
  const [clientId, setClientId] = React.useState<string>(props.initialClientId ?? "__none__");
  const [schema, setSchema] = React.useState<FormField[]>(props.initialSchema);
  const [status, setStatus] = React.useState(props.initialStatus);
  const [saving, setSaving] = React.useState(false);

  // Re-sync when the sheet opens with new initial values (e.g. user clicked "Edit schema" on a different form).
  React.useEffect(() => {
    if (open) {
      setTitle(props.initialTitle);
      setDescription(props.initialDescription);
      setClientId(props.initialClientId ?? "__none__");
      setSchema(props.initialSchema.length ? props.initialSchema : [blankField("text")]);
      setStatus(props.initialStatus);
    }
  }, [open, props.formId, props.initialTitle, props.initialDescription, props.initialClientId, props.initialSchema, props.initialStatus]);

  const addField = (type: FieldType) => {
    setSchema((s) => [...s, blankField(type)]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setSchema((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setSchema((s) => s.filter((f) => f.id !== id));
  };

  const moveField = (index: number, dir: -1 | 1) => {
    setSchema((s) => {
      const next = [...s];
      const target = index + dir;
      if (target < 0 || target >= next.length) return s;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await props.onSave({
        id: props.formId,
        title: title.trim(),
        description: description.trim(),
        clientId: clientId === "__none__" ? null : clientId,
        schema: schema.filter((f) => f.label.trim() !== ""),
        status,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="gap-1 border-b border-border px-5 py-4">
          <SheetTitle className="text-base">
            {props.formId ? "Edit form schema" : "New form"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Compose fields, set required, then preview live on the right. Save to publish later or mark as published.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
          {/* Builder pane */}
          <div className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1 px-5 py-4">
              <div className="space-y-4">
                {/* Form meta */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="form-title">Title</Label>
                    <Input
                      id="form-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Client Intake — Acme"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-desc">Description</Label>
                    <Textarea
                      id="form-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A short blurb shown at the top of the form."
                      className="min-h-20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-client">Linked client</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger id="form-client" className="w-full">
                        <SelectValue placeholder="Reusable (no client)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Reusable (no client)</SelectItem>
                        {props.clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.company ? ` · ${c.company}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger id="form-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Fields</Label>
                    <span className="text-[11px] text-muted-foreground">
                      {schema.length} field{schema.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {schema.length === 0 && (
                    <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No fields yet. Add one below.
                    </p>
                  )}

                  <div className="space-y-2">
                    {schema.map((field, idx) => (
                      <FieldRow
                        key={field.id}
                        field={field}
                        index={idx}
                        total={schema.length}
                        onChange={(patch) => updateField(field.id, patch)}
                        onRemove={() => removeField(field.id)}
                        onMove={(dir) => moveField(idx, dir)}
                      />
                    ))}
                  </div>

                  <FieldAddMenu onAdd={addField} />
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()} className="h-9">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : props.formId ? (
                  "Save changes"
                ) : (
                  "Create form"
                )}
              </Button>
            </SheetFooter>
          </div>

          {/* Live preview pane */}
          <aside className="flex min-h-0 flex-col border-t border-border bg-muted/30 lg:w-[360px] lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 px-5 py-3">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Live preview
              </span>
            </div>
            <Separator />
            <ScrollArea className="min-h-0 flex-1 px-5 py-4">
              <div className="rounded-lg border border-border bg-background p-4 surface-highlight">
                <h3 className="text-sm font-semibold">{title || "Untitled form"}</h3>
                {description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                ) : null}
                <Separator className="my-3" />
                {schema.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Add a field to see it render here.
                  </p>
                ) : (
                  <FormRenderer
                    fields={schema}
                    submitLabel="Submit"
                    embedded
                    onSubmit={() => {
                      /* preview only */
                    }}
                  />
                )}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const TYPE_ICON: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  longtext: AlignLeft,
  select: ListChecks,
  checkbox: CheckSquare,
  date: CalendarIcon,
  file: Upload,
};

function FieldAddMenu({ onAdd }: { onAdd: (t: FieldType) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-2">
      <p className="px-1 pb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        Add field
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {FIELD_TYPES.map((t) => {
          const Icon = TYPE_ICON[t.value];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onAdd(t.value)}
              className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-md border border-border bg-background px-2 text-[10px] font-medium transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={t.hint}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const Icon = TYPE_ICON[field.type];
  return (
    <div className="rounded-lg border border-border bg-background p-3 surface-highlight">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-muted px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" />
          {field.type}
        </span>
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Field label"
          className="h-8 flex-1"
        />
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-rose-foreground hover:bg-rose/20"
            onClick={onRemove}
            aria-label="Remove field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between pl-6">
        <div className="flex items-center gap-2">
          {field.type === "select" ? (
            <span className="text-[11px] text-muted-foreground">
              {field.options?.length ?? 0} options
            </span>
          ) : null}
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <Switch
              checked={!!field.required}
              onCheckedChange={(c) => onChange({ required: c })}
              aria-label="Required"
            />
            Required
          </label>
        </div>
      </div>

      {field.type === "select" ? (
        <div className="mt-2 space-y-1.5 pl-6">
          {field.options?.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={opt}
                onChange={(e) => {
                  const next = [...(field.options ?? [])];
                  next[i] = e.target.value;
                  onChange({ options: next });
                }}
                className="h-7 flex-1 text-xs"
                placeholder={`Option ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-rose-foreground"
                onClick={() =>
                  onChange({
                    options: (field.options ?? []).filter((_, j) => j !== i),
                  })
                }
                aria-label="Remove option"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={() =>
              onChange({ options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`] })
            }
          >
            <Plus className="h-3 w-3" /> Add option
          </Button>
        </div>
      ) : null}
    </div>
  );
}
