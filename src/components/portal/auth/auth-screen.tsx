"use client";

import * as React from "react";
import { useAuth } from "./auth-store";
import { apiPost } from "@/components/portal/query-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, Mail, Loader2, CheckCircle2, ExternalLink, Zap } from "lucide-react";

type Step = "input" | "sent" | "verifying";

export function AuthScreen() {
  const setSession = useAuth((s) => s.setSession);
  const [step, setStep] = React.useState<Step>("input");
  const [email, setEmail] = React.useState("");
  const [magicLink, setMagicLink] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await apiPost<{ ok: boolean; magicLink: string; isNewUser: boolean; email: string }>(
        "/api/auth/request-magic-link",
        { email: email.trim() }
      );
      setMagicLink(res.magicLink);
      setStep("sent");
      toast.success("Magic link generated");
    } catch (err) {
      toast.error("Failed to generate magic link", {
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyLink = async () => {
    setStep("verifying");
    try {
      const token = new URL(magicLink).searchParams.get("token");
      if (!token) {
        toast.error("Invalid link");
        setStep("sent");
        return;
      }
      const res = await apiPost<{ ok: boolean; sessionToken: string; user: { id: string; email: string; fullName: string; role: string; isDemo: boolean } }>(
        "/api/auth/verify-magic-link",
        { token }
      );
      setSession(res.sessionToken, res.user);
      toast.success(`Welcome${res.user.isDemo ? "" : ", " + res.user.fullName}!`);
      // The page will re-render automatically when auth state changes
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error("Verification failed", { description: (err as Error).message });
      setStep("sent");
    }
  };

  const continueAsDemo = async () => {
    setLoading(true);
    try {
      const res = await apiPost<{ ok: boolean; sessionToken: string; user: { id: string; email: string; fullName: string; role: string; isDemo: boolean } }>(
        "/api/auth/demo",
        {}
      );
      setSession(res.sessionToken, res.user);
      toast.success("Welcome to the demo!");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error("Failed to start demo", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M21 3l-7 7" />
              <path d="M3 3l7 7" />
              <path d="M16 21h5v-5" />
              <path d="M8 21H3v-5" />
              <path d="M21 21l-7-7" />
              <path d="M3 21l7-7" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Raptor Portal</h1>
            <p className="text-sm text-muted-foreground">Client workspace, reimagined.</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl surface-highlight">
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Sign in or create account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we'll send you a magic link. No password needed.
                </p>
              </div>
              <form onSubmit={requestLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {loading ? "Sending…" : "Send magic link"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={continueAsDemo} disabled={loading}>
                <Zap className="h-4 w-4" />
                Continue as demo user
              </Button>
            </div>
          )}

          {step === "sent" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-foreground">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Magic link ready</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="text-muted-foreground">
                  In production, an email would be sent to <span className="font-mono text-foreground">{email}</span>.
                  For this demo, click the link below to sign in:
                </p>
              </div>
              <button
                onClick={verifyLink}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <ExternalLink className="h-4 w-4" />
                Click here to sign in
              </button>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setStep("input")}>
                Use a different email
              </Button>
            </div>
          )}

          {step === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your magic link…</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
