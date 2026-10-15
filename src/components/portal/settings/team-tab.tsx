"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { UserPlus, Loader2, Copy, Check, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQueryState, apiPost } from "@/components/portal/query-hooks";
import { initials, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamResponse } from "./types";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-primary text-primary-foreground border-transparent",
  admin: "bg-secondary text-secondary-foreground border-transparent",
  member: "bg-sky text-sky-foreground border-transparent",
  client: "bg-emerald text-emerald-foreground border-transparent",
};

export function TeamTab() {
  const teamQuery = useQueryState<TeamResponse>("team");
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const team = teamQuery.data?.team ?? [];

  if (teamQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">
            {team.length} member{team.length === 1 ? "" : "s"} with access to this workspace.
          </p>
        </div>
        <Button className="h-9 gap-1.5" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </header>

      <Card className="py-0">
        <CardContent className="p-0">
          {team.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No team members.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Member</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-right text-xs">Member since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((m, i) => (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                              {initials(m.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{m.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {m.email}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2 py-0 text-[11px] uppercase tracking-wide",
                            ROLE_BADGE[m.role] ?? ""
                          )}
                        >
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-[11px] text-muted-foreground">
                        {relativeTime(m.createdAt)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [sending, setSending] = React.useState(false);
  const [inviteResult, setInviteResult] = React.useState<{
    inviteLink?: string;
    emailSent?: boolean;
    name: string;
    email: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const copyLink = () => {
    if (!inviteResult?.inviteLink) return;
    navigator.clipboard.writeText(inviteResult.inviteLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await apiPost<{
        ok: boolean;
        member: any;
        inviteLink?: string;
        emailSent?: boolean;
        message?: string;
      }>("/api/portal/team", {
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role,
      });

      qc.invalidateQueries({ queryKey: ["team"] });

      if (res.emailSent) {
        toast.success(`Invitation email sent to ${email.trim()}!`);
        setEmail("");
        setFullName("");
        onOpenChange(false);
      } else if (res.inviteLink) {
        setInviteResult({
          inviteLink: res.inviteLink,
          emailSent: false,
          name: fullName || email.split("@")[0],
          email: email.trim(),
        });
      } else {
        toast.success("Team member invited successfully.");
        setEmail("");
        setFullName("");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error("Failed to send invitation", {
        description: (err as Error).message,
      });
    } finally {
      setSending(false);
    }
  };

  const closeAll = () => {
    setInviteResult(null);
    setEmail("");
    setFullName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeAll(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Invite team member</DialogTitle>
          <DialogDescription className="text-xs">
            Invite a collaborator to access and manage project tasks in this workspace.
          </DialogDescription>
        </DialogHeader>

        {inviteResult ? (
          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="font-semibold text-foreground">Invitation generated for {inviteResult.email}</p>
              <p className="text-muted-foreground text-[11px]">
                Copy this link to allow them to verify their account and join immediately:
              </p>
            </div>
            {inviteResult.inviteLink && (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteResult.inviteLink}
                  className="text-xs font-mono h-8 bg-background"
                />
                <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={copyLink}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button onClick={closeAll} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sarah Connor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@domain.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (Collaborator)</SelectItem>
                  <SelectItem value="admin">Admin (Manager)</SelectItem>
                  <SelectItem value="client">Client (Guest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sending || !email.trim()}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Sending…
                  </>
                ) : (
                  "Send invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
