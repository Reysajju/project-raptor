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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, MessageSquarePlus, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/components/portal/user-store";
import { apiPatch } from "@/components/portal/query-hooks";
import type { Approval } from "./types";

export type DecisionMode = "approved" | "changes_requested" | "reopen";

export interface DecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: Approval | null;
  mode: DecisionMode;
}

const MODE_META: Record<
  DecisionMode,
  {
    title: string;
    description: string;
    actionLabel: string;
    buttonLabel: string;
    buttonIcon: React.ComponentType<{ className?: string }>;
    buttonClass: string;
    commentLabel: string;
    commentPlaceholder: string;
    commentRequired?: boolean;
  }
> = {
  approved: {
    title: "Approve this request",
    description: "Record an approval decision. The client will be notified.",
    actionLabel: "Approve",
    buttonLabel: "Approve",
    buttonIcon: Check,
    buttonClass:
      "bg-emerald text-emerald-foreground hover:bg-emerald/90",
    commentLabel: "Comment (optional)",
    commentPlaceholder: "Add a note for the client (e.g. 'Looks great — go ahead').",
  },
  changes_requested: {
    title: "Request changes",
    description:
      "Mark this request as needing changes. Add a comment explaining what to update.",
    actionLabel: "Request changes",
    buttonLabel: "Request changes",
    buttonIcon: MessageSquarePlus,
    buttonClass:
      "border-rose/60 text-rose-foreground hover:bg-rose/30",
    commentLabel: "Comment",
    commentPlaceholder: "Describe what needs to change before this can be approved.",
    commentRequired: true,
  },
  reopen: {
    title: "Reopen this request",
    description:
      "Move this approval back to pending. The previous decision will be cleared.",
    actionLabel: "Reopen",
    buttonLabel: "Reopen",
    buttonIcon: RotateCcw,
    buttonClass: "outline",
    commentLabel: "Comment (optional)",
    commentPlaceholder: "Why is this being reopened?",
  },
};

export function DecisionDialog({
  open,
  onOpenChange,
  approval,
  mode,
}: DecisionDialogProps) {
  const user = useCurrentUser((s) => s.user);
  const qc = useQueryClient();
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const meta = MODE_META[mode];

  // Reset comment when dialog opens for a fresh decision.
  React.useEffect(() => {
    if (!open) return;
    setComment("");
  }, [open, mode, approval?.id]);

  if (!open || !approval) return null;

  const status =
    mode === "approved"
      ? "approved"
      : mode === "changes_requested"
        ? "changes_requested"
        : "pending";

  const commentRequired = meta.commentRequired;
  const canSubmit = !submitting && (!commentRequired || comment.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!approval) return;
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await apiPatch(`/api/portal/approvals/${approval.id}`, {
        status,
        comment: comment.trim(),
        decidedById: user?.id ?? null,
      });
      qc.invalidateQueries({ queryKey: ["approvals"] });
      toast.success(
        mode === "approved"
          ? "Approval recorded"
          : mode === "changes_requested"
            ? "Changes requested"
            : "Reopened",
        { description: approval.title }
      );
      onOpenChange(false);
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const ButtonIcon = meta.buttonIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ButtonIcon className="h-4 w-4" />
            {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs">
            <p className="font-medium text-foreground">{approval.title}</p>
            {approval.client && (
              <p className="mt-0.5 text-muted-foreground">
                {approval.client.name}
                {approval.project ? ` · ${approval.project.title}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="decision-comment">{meta.commentLabel}</Label>
            <Textarea
              id="decision-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={meta.commentPlaceholder}
              rows={4}
              required={commentRequired}
            />
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
            <Button
              type="submit"
              disabled={!canSubmit}
              className={meta.buttonClass}
              variant={mode === "changes_requested" ? "outline" : "default"}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Working…
                </>
              ) : (
                <>
                  <ButtonIcon className="h-4 w-4" /> {meta.buttonLabel}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
