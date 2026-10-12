"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText,
  Check,
  MessageSquarePlus,
  RotateCcw,
  Eye,
  Quote,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNav } from "@/components/portal/nav-store";
import { StatusBadge } from "@/components/portal/common/status-badge";
import { initials, relativeTime } from "@/lib/format";
import type { Approval } from "./types";
import { accentDot } from "./accent";

export interface ApprovalCardProps {
  approval: Approval;
  onDecision: (approval: Approval, mode: "approved" | "changes_requested" | "reopen") => void;
}

export function ApprovalCard({ approval, onDecision }: ApprovalCardProps) {
  const nav = useNav();
  const isPending = approval.status === "pending";
  const isDecided =
    approval.status === "approved" || approval.status === "changes_requested";

  const client = approval.client;
  const project = approval.project;
  const file = approval.file;
  const decider = approval.decider;

  function handleViewFile() {
    if (file) {
      toast.success("Opening file preview", { description: file.fileName });
    } else {
      toast.info("No file attached to this approval");
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 surface-highlight"
    >
      {/* Header: title + status */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight">
            {approval.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {client && (
              <>
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => nav.openClient(client.id, "approvals")}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: accentDot(client.accentColor) }}
                    aria-hidden
                  />
                  {client.name}
                </button>
                <span aria-hidden>·</span>
              </>
            )}
            {project && (
              <>
                <span className="truncate">{project.title}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(approval.createdAt)}
            </span>
          </div>
        </div>
        <StatusBadge status={approval.status} />
      </div>

      {/* File link (if any) */}
      {file && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate text-xs">{file.fileName}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 px-2 text-[11px]"
            onClick={handleViewFile}
          >
            <Eye className="h-3.5 w-3.5" /> View file
          </Button>
        </div>
      )}

      {/* Decision history (only when decided) */}
      {isDecided && decider && (
        <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                {initials(decider.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">
              {decider.fullName}
            </span>
            <span className="text-muted-foreground">decided</span>
            {approval.decidedAt && (
              <span className="text-muted-foreground">
                {relativeTime(approval.decidedAt)}
              </span>
            )}
          </div>
          {approval.comment && (
            <div className="mt-2 flex gap-1.5">
              <Quote className="h-3 w-3 shrink-0 text-muted-foreground" />
              <p className="italic text-muted-foreground">
                &ldquo;{approval.comment}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pending comment (if any) */}
      {isPending && approval.comment && (
        <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs">
          <div className="flex gap-1.5">
            <Quote className="h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="italic text-muted-foreground">
              &ldquo;{approval.comment}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {isPending && (
          <>
            <Button
              size="sm"
              className="bg-emerald text-emerald-foreground hover:bg-emerald/90"
              onClick={() => onDecision(approval, "approved")}
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose/60 text-rose-foreground hover:bg-rose/30"
              onClick={() => onDecision(approval, "changes_requested")}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" /> Request changes
            </Button>
          </>
        )}
        {isDecided && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecision(approval, "reopen")}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reopen
          </Button>
        )}
      </div>
    </motion.article>
  );
}
