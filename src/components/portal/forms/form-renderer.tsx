"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select as SelectBox,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormField } from "./types";

interface FormRendererProps {
  fields: FormField[];
  submitLabel?: string;
  onSubmit: (answers: Record<string, unknown>) => Promise<void> | void;
  embedded?: boolean;
}

/**
 * Renders a form from a JSON schema. Used both as the live preview inside the
 * schema builder sheet and as the body of the "Preview form" dialog (where
 * the submit actually posts to the API).
 */
export function FormRenderer({
  fields,
  submitLabel = "Submit",
  onSubmit,
  embedded = false,
}: FormRendererProps) {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const set = (id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Reset when the field set changes (so the preview stays fresh as the user
  // edits the schema).
  React.useEffect(() => {
    setAnswers({});
    setDone(false);
    setSubmitting(false);
  }, [fields]);

  const reset = () => {
    setAnswers({});
    setDone(false);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(answers);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-emerald-foreground">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold">Response submitted</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thank you — your answers were recorded.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="h-8">
          Submit another response
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", embedded && "space-y-3")}>
      {fields.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          This form has no fields yet.
        </p>
      ) : (
        fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(v) => set(field.id, v)}
            compact={embedded}
          />
        ))
      )}

      {fields.length > 0 && (
        <Button
          type="submit"
          disabled={submitting}
          className="h-9 w-full sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      )}
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  compact,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  compact?: boolean;
}) {
  const labelClass = cn(
    "text-sm font-medium leading-none",
    compact && "text-xs"
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`fld-${field.id}`} className={labelClass}>
          {field.label || <span className="text-muted-foreground italic">Untitled field</span>}
          {field.required && <span className="ml-0.5 text-rose-foreground">*</span>}
        </Label>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {field.type}
        </span>
      </div>

      {field.type === "text" && (
        <Input
          id={`fld-${field.id}`}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder="Type your answer…"
          className="h-9"
        />
      )}

      {field.type === "longtext" && (
        <Textarea
          id={`fld-${field.id}`}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder="Type your answer…"
          className="min-h-24"
        />
      )}

      {field.type === "select" && (
        <SelectBox
          value={(value as string) ?? ""}
          onValueChange={onChange}
        >
          <SelectTrigger id={`fld-${field.id}`} className="h-9 w-full">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt, i) => (
              <SelectItem key={i} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectBox>
      )}

      {field.type === "checkbox" && (
        <label
          htmlFor={`fld-${field.id}`}
          className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2.5 transition-colors hover:bg-muted/40"
        >
          <Checkbox
            id={`fld-${field.id}`}
            checked={!!value}
            onCheckedChange={(c) => onChange(!!c)}
            className="mt-0.5"
          />
          <span className="text-xs text-muted-foreground">
            {field.required ? "I agree (required)" : "Check to confirm"}
          </span>
        </label>
      )}

      {field.type === "date" && (
        <Input
          id={`fld-${field.id}`}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="h-9"
        />
      )}

      {field.type === "file" && (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onChange(e.dataTransfer.files?.[0]?.name ?? "");
          }}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs font-medium">
            {value ? (value as string) : "Drop a file or click to upload"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Decorative — no real upload
          </p>
          <input
            type="file"
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
          />
        </div>
      )}
    </div>
  );
}

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: FormField[];
  onSubmit: (answers: Record<string, unknown>) => Promise<void> | void;
}

export function FormPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
}: FormPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{title || "Preview form"}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          ) : (
            <DialogDescription className="text-xs">
              This is how a client would see and fill the form.
            </DialogDescription>
          )}
        </DialogHeader>
        <FormRenderer
          fields={fields}
          submitLabel="Submit response"
          onSubmit={onSubmit}
        />
        <DialogFooter className="sr-only">
          <span>Form preview dialog</span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
