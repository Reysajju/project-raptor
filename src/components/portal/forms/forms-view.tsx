"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users as UsersIcon,
  ListChecks,
  Inbox as InboxIcon,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState as EmptyStateCard } from "@/components/portal/common/empty-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  apiDelete,
  apiPatch,
  apiPost,
  useQueryState,
} from "@/components/portal/query-hooks";
import { StatusBadge } from "@/components/portal/common/status-badge";
import { initials, relativeTime } from "@/lib/format";
import {
  type FormField,
  type FormRecord,
  type FormsListResponse,
  type ClientsListResponse,
} from "./types";
import { SchemaBuilder } from "./schema-builder";
import { FormPreviewDialog } from "./form-renderer";

// Re-exported for callers needing the schema shape type.
export type { FormField, FormRecord };

export function FormsView() {
  const qc = useQueryClient();
  const formsQuery = useQueryState<FormsListResponse>("forms");
  const clientsQuery = useQueryState<ClientsListResponse>("clients");

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<{
    id: string | null;
    title: string;
    description: string;
    clientId: string | null;
    schema: FormField[];
    status: string;
  } | null>(null);
  const [preview, setPreview] = React.useState<FormRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const forms = formsQuery.data?.forms ?? [];

  const published = forms.filter((f) => f.status === "published").length;
  const draft = forms.filter((f) => f.status === "draft").length;

  const openNew = () => {
    setEditing({
      id: null,
      title: "",
      description: "",
      clientId: null,
      schema: [],
      status: "draft",
    });
    setBuilderOpen(true);
  };

  const openEdit = (form: FormRecord) => {
    setEditing({
      id: form.id,
      title: form.title,
      description: form.description,
      clientId: form.clientId,
      schema: form.schemaJson ?? [],
      status: form.status,
    });
    setBuilderOpen(true);
  };

  const handleSave = async (input: {
    id: string | null;
    title: string;
    description: string;
    clientId: string | null;
    schema: FormField[];
    status: string;
  }) => {
    try {
      if (input.id) {
        await apiPatch(`/api/portal/forms/${input.id}`, {
          title: input.title,
          description: input.description,
          schema: input.schema,
          status: input.status,
        });
        toast.success("Form updated");
      } else {
        await apiPost("/api/portal/forms", {
          title: input.title,
          description: input.description,
          clientId: input.clientId,
          schema: input.schema,
          status: input.status,
        });
        toast.success("Form created");
      }
      qc.invalidateQueries({ queryKey: ["forms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error("Save failed", { description: (err as Error).message });
      throw err;
    }
  };

  const handleTogglePublish = async (form: FormRecord) => {
    const next = form.status === "published" ? "draft" : "published";
    try {
      await apiPatch(`/api/portal/forms/${form.id}`, { status: next });
      toast.success(next === "published" ? "Form published" : "Form moved to drafts");
      qc.invalidateQueries({ queryKey: ["forms"] });
    } catch (err) {
      toast.error("Update failed", { description: (err as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`/api/portal/forms/${deleteId}`);
      toast.success("Form deleted");
      qc.invalidateQueries({ queryKey: ["forms"] });
    } catch (err) {
      toast.error("Delete failed", { description: (err as Error).message });
    } finally {
      setDeleteId(null);
    }
  };

  const handleSubmitResponse = async (
    form: FormRecord,
    answers: Record<string, unknown>
  ) => {
    try {
      await apiPost(`/api/portal/forms/${form.id}/responses`, {
        clientId: form.clientId,
        answers,
      });
      toast.success("Response submitted");
      qc.invalidateQueries({ queryKey: ["forms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error("Submission failed", { description: (err as Error).message });
      throw err;
    }
  };

  if (formsQuery.isLoading) return <FormsSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Intake &amp; surveys
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-mono text-emerald-foreground">{published}</span> published ·{" "}
            <span className="font-mono">{draft}</span> draft
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => formsQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9" onClick={openNew}>
            <Plus className="h-4 w-4" /> New form
          </Button>
        </div>
      </header>

      {/* Empty state */}
      {forms.length === 0 && (
        <Card className="surface-highlight">
          <CardContent className="py-12">
            <EmptyStateCard
              illustration="forms"
              title="No forms yet"
              description="Create a reusable form or a client-specific intake questionnaire."
              action={
                <Button size="sm" className="h-9" onClick={openNew}>
                  <Plus className="h-4 w-4" /> New form
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Forms list */}
      <div className="space-y-3">
        {forms.map((form, i) => (
          <motion.div
            key={form.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
          >
            <FormCard
              form={form}
              onEdit={() => openEdit(form)}
              onPreview={() => setPreview(form)}
              onTogglePublish={() => handleTogglePublish(form)}
              onDelete={() => setDeleteId(form.id)}
              onSubmitResponse={(answers) => handleSubmitResponse(form, answers)}
            />
          </motion.div>
        ))}
      </div>

      {/* Schema builder sheet */}
      {editing && (
        <SchemaBuilder
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          formId={editing.id}
          initialTitle={editing.title}
          initialDescription={editing.description}
          initialClientId={editing.clientId}
          initialSchema={editing.schema}
          initialStatus={editing.status}
          clients={clientsQuery.data?.clients ?? []}
          onSave={handleSave}
        />
      )}

      {/* Preview dialog */}
      {preview && (
        <FormPreviewDialog
          open={!!preview}
          onOpenChange={(o) => !o && setPreview(null)}
          title={preview.title}
          description={preview.description}
          fields={preview.schemaJson ?? []}
          onSubmit={(answers) => handleSubmitResponse(preview, answers)}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              The form and all its responses will be permanently removed. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormCard({
  form,
  onEdit,
  onPreview,
  onTogglePublish,
  onDelete,
  onSubmitResponse,
}: {
  form: FormRecord;
  onEdit: () => void;
  onPreview: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onSubmitResponse: (answers: Record<string, unknown>) => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const schema = form.schemaJson ?? [];
  const fieldCount = schema.length;
  const responseCount = form.responses?.length ?? 0;

  const clientLabel = form.client
    ? `${form.client.name}${form.client.company ? ` · ${form.client.company}` : ""}`
    : "Reusable (no client)";

  return (
    <Card className="surface-highlight overflow-hidden py-0">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: identity */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">{form.title}</h3>
            <StatusBadge status={form.status} />
          </div>
          {form.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {form.description}
            </p>
          ) : (
            <p className="mt-1 text-xs italic text-muted-foreground">
              No description
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              {clientLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {fieldCount} field{fieldCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <InboxIcon className="h-3 w-3" />
              {responseCount} response{responseCount === 1 ? "" : "s"}
            </span>
            <span>Updated {relativeTime(form.updatedAt)}</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onPreview}>
            <Eye className="h-3.5 w-3.5" /> Preview form
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit schema
          </Button>
          <Button
            variant={form.status === "published" ? "secondary" : "default"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={onTogglePublish}
          >
            {form.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:bg-rose/20 hover:text-rose-foreground"
            onClick={onDelete}
            aria-label="Delete form"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Responses inline expander */}
      {responseCount > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="border-t border-border bg-muted/30 px-4">
            <CollapsibleTrigger asChild>
              <button className="flex h-11 w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  View responses
                  <span className="text-muted-foreground">
                    · {responseCount} submitted
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {expanded ? "Hide" : "Show"}
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ResponsesPanel
                form={form}
                onMarkReviewed={(responseId) => {
                  // Optimistic update only — no per-response PATCH endpoint.
                  void responseId;
                  toast.success("Marked reviewed (demo)");
                }}
              />
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </Card>
  );
}

function ResponsesPanel({
  form,
  onMarkReviewed,
}: {
  form: FormRecord;
  onMarkReviewed: (responseId: string) => void;
}) {
  const responses = form.responses ?? [];
  return (
    <div className="space-y-2 pb-4">
      {responses.map((r) => (
        <ResponseRow
          key={r.id}
          form={form}
          responseId={r.id}
          submittedAt={r.submittedAt}
          clientName={r.client?.name ?? null}
          answers={r.answersJson ?? {}}
          status={r.status}
          onMarkReviewed={() => onMarkReviewed(r.id)}
        />
      ))}
    </div>
  );
}

function ResponseRow({
  form,
  responseId,
  submittedAt,
  clientName,
  answers,
  status,
  onMarkReviewed,
}: {
  form: FormRecord;
  responseId: string;
  submittedAt: string;
  clientName: string | null;
  answers: Record<string, unknown>;
  status: string;
  onMarkReviewed: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const schema = form.schemaJson ?? [];

  // Build a label lookup so the answers table reads nicely even if field order
  // differs from insertion order.
  const labelFor = (id: string) =>
    schema.find((f) => f.id === id)?.label ?? id;

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
            {clientName ? initials(clientName) : "—"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {clientName ?? "Anonymous"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Submitted {relativeTime(submittedAt)}
          </p>
        </div>
        <StatusBadge status={status} />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <>
              <ChevronDown className="h-3 w-3" /> Hide answers
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" /> View answers
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={onMarkReviewed}
          disabled={status === "reviewed"}
        >
          Mark reviewed
        </Button>
      </div>
      {open && (
        <div className="border-t border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2 text-xs">Field</TableHead>
                <TableHead className="text-xs">Answer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(answers).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="py-2 text-xs font-medium text-muted-foreground">
                    {labelFor(key)}
                  </TableCell>
                  <TableCell className="py-2 text-xs">
                    {renderAnswer(value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function renderAnswer(value: unknown) {
  if (value === null || value === undefined || value === "")
    return <span className="text-muted-foreground italic">—</span>;
  if (typeof value === "boolean")
    return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value.join(", ");
  return String(value);
}

function FormsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
