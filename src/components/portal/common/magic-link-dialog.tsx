"use client";

import * as React from "react";
import {
  Link2,
  Copy,
  Check,
  Mail,
  Clock,
  ShieldCheck,
  ExternalLink,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MagicLinkDialogProps {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Simulates the client portal magic-link login flow. Generates a
 * time-limited token (client-side, not cryptographically real), shows a
 * preview of the email the client would receive, and lets staff copy the
 * link or "send" it (which writes a system event to the timeline).
 */
export function MagicLinkDialog({
  clientId,
  clientName,
  clientEmail,
  open,
  onOpenChange,
}: MagicLinkDialogProps) {
  const [token, setToken] = React.useState("");
  const [expiresIn, setExpiresIn] = React.useState(15); // minutes
  const [generatedAt, setGeneratedAt] = React.useState<Date | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  // Generate a new token when the dialog opens
  React.useEffect(() => {
    if (open) {
      const newToken = generateToken();
      setToken(newToken);
      setGeneratedAt(new Date());
      setCopied(false);
      setSent(false);
    }
  }, [open]);

  const magicLink = `${typeof window !== "undefined" ? window.location.origin : "https://portal.onboardwithus.com"}/portal/login?token=${token}&client=${clientId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Magic link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const sendLink = async () => {
    setSent(true);
    // Write a system event to the timeline
    try {
      await fetch("/api/portal/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          channel: "system",
          direction: "internal",
          bodyText: `Portal magic link sent to ${clientEmail || clientName}. Expires in ${expiresIn} minutes.`,
          status: "done",
        }),
      });
      toast.success(`Magic link "sent" to ${clientEmail || clientName}`, {
        description: "A system event was logged on the timeline.",
      });
    } catch {
      toast.error("Failed to log the magic link event");
    }
  };

  const regenerate = () => {
    setToken(generateToken());
    setGeneratedAt(new Date());
    setCopied(false);
    setSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Link2 className="h-4 w-4" />
            </span>
            Portal access — {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email preview */}
          {clientEmail ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Mail className="h-3 w-3" />
                Send to
              </p>
              <p className="mt-0.5 truncate font-mono text-xs">{clientEmail}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber/40 bg-amber/10 p-3">
              <p className="text-xs text-amber-foreground">
                This client has no email address. Add one in the Details tab to send magic links.
              </p>
            </div>
          )}

          {/* Expiry selector */}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Expires in</span>
            <div className="flex gap-1">
              {[15, 30, 60, 1440].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setExpiresIn(mins)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                    expiresIn === mins
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {mins < 60 ? `${mins}m` : mins < 1440 ? `${mins / 60}h` : "24h"}
                </button>
              ))}
            </div>
          </div>

          {/* The magic link */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Magic link</Label>
            <div className="flex items-center gap-1.5">
              <Input
                readOnly
                value={magicLink}
                className="font-mono text-[11px]"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={copyLink}
                aria-label="Copy magic link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-foreground" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-foreground" />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              This is a simulated magic link for demo purposes. In production, the client
              would receive an email with a one-time link that authenticates them into a
              restricted portal view (their approvals, files, forms, and messages only).
            </p>
          </div>

          {/* Sent confirmation */}
          {sent && (
            <div className="flex items-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 p-2.5">
              <Check className="h-4 w-4 text-emerald-foreground" />
              <p className="text-xs text-emerald-foreground">
                Magic link "sent" — a system event was logged on the timeline.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={regenerate}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={sendLink} disabled={!clientEmail || sent}>
            <Mail className="mr-1.5 h-3.5 w-3.5" /> {sent ? "Sent" : "Send link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={cn("block text-[11px] font-medium text-muted-foreground", className)}>{children}</label>;
}
