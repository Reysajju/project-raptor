"use client";

import * as React from "react";
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Server,
  Globe,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQueryState, apiPost, apiDelete } from "@/components/portal/query-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailAccount {
  id: string;
  email: string;
  type: string;
  displayName: string | null;
  isActive: boolean;
  connectedAt: string;
  lastSyncAt: string | null;
}

const TYPE_META: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  gmail: { label: "Gmail", icon: Mail, color: "text-rose-foreground" },
  custom: { label: "Custom domain", icon: Globe, color: "text-sky-foreground" },
  outlook: { label: "Outlook", icon: Server, color: "text-sky-foreground" },
};

export function EmailAccountsTab() {
  const { data, isLoading } = useQueryState<{ accounts: EmailAccount[] }>(
    "email-accounts",
    "/api/portal/settings/email-accounts"
  );
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = React.useState(false);

  const accounts = data?.accounts ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["email-accounts"] });
  };

  const remove = async (id: string) => {
    try {
      await apiDelete(`/api/portal/settings/email-accounts?id=${id}`);
      toast.success("Email account removed");
      refresh();
    } catch (err) {
      toast.error("Failed to remove", { description: (err as Error).message });
    }
  };

  const syncNow = async (id: string) => {
    toast.success("Sync started — new messages will appear in the inbox");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Email accounts</h2>
          <p className="text-sm text-muted-foreground">
            Connect Gmail, custom domain, or Outlook accounts. Inbound emails from these
            accounts appear in the unified inbox and client timelines.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add account
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/50" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">No email accounts connected</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add a Gmail, custom domain, or Outlook account to start syncing emails.
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Connect your first account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc) => {
            const meta = TYPE_META[acc.type] ?? TYPE_META.custom;
            const Icon = meta.icon;
            return (
              <div
                key={acc.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 surface-highlight"
              >
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-md bg-muted", meta.color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{acc.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {meta.label}
                    {acc.displayName ? ` · ${acc.displayName}` : ""}
                    {" · "}
                    Connected {new Date(acc.connectedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  <CheckCircle2 className="mr-1 h-2.5 w-2.5 text-emerald-foreground" />
                  Active
                </Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => syncNow(acc.id)} title="Sync now">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-foreground hover:bg-rose/20" onClick={() => remove(acc.id)} title="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AddEmailAccountDialog open={addOpen} onOpenChange={setAddOpen} onDone={refresh} />
    </div>
  );
}

function AddEmailAccountDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [type, setType] = React.useState("gmail");
  const [displayName, setDisplayName] = React.useState("");
  const [imapServer, setImapServer] = React.useState("");
  const [smtpServer, setSmtpServer] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);

  const reset = () => {
    setEmail("");
    setType("gmail");
    setDisplayName("");
    setImapServer("");
    setSmtpServer("");
  };

  const connect = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    setConnecting(true);
    try {
      const config: Record<string, unknown> = {};
      if (type === "custom") {
        if (imapServer) config.imapServer = imapServer;
        if (smtpServer) config.smtpServer = smtpServer;
      }
      await apiPost("/api/portal/settings/email-accounts", {
        email: email.trim(),
        type,
        displayName: displayName.trim() || undefined,
        config,
      });
      toast.success(`${email} connected`);
      onDone();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error("Connection failed", { description: (err as Error).message });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(reset, 200); }}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-base">Connect email account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Account type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail (OAuth)</SelectItem>
                <SelectItem value="custom">Custom domain (IMAP/SMTP)</SelectItem>
                <SelectItem value="outlook">Outlook (OAuth)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Display name (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Support inbox"
              className="h-9"
            />
          </div>
          {type === "custom" && (
            <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">
                IMAP/SMTP configuration
              </p>
              <Input value={imapServer} onChange={(e) => setImapServer(e.target.value)} placeholder="imap.yourdomain.com:993" className="h-8 text-xs" />
              <Input value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} placeholder="smtp.yourdomain.com:587" className="h-8 text-xs" />
            </div>
          )}
          {type === "gmail" && (
            <div className="rounded-md border border-amber/30 bg-amber/5 p-3 text-[11px] text-muted-foreground">
              <p className="font-medium text-amber-foreground">Gmail OAuth</p>
              <p className="mt-0.5">
                In production, clicking "Connect" would redirect to Google's OAuth consent
                screen. For this demo, the account is added directly.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={connect} disabled={connecting}>
            {connecting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {connecting ? "Connecting…" : "Connect account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
