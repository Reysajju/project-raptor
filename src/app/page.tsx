"use client";

import * as React from "react";
import { AppShell } from "@/components/portal/app-shell";
import { QueryProvider } from "@/components/portal/query-provider";
import { useCurrentUser } from "@/components/portal/user-store";
import { useNav } from "@/components/portal/nav-store";
import { CommandPalette } from "@/components/portal/command/command-palette";
import { ShortcutHelpOverlay } from "@/components/portal/common/shortcut-help";
import { FocusTimer } from "@/components/portal/common/focus-timer";
import { useNavGotoShortcuts } from "@/components/portal/common/use-goto-shortcuts";
import { useAuth } from "@/components/portal/auth/auth-store";
import { AuthScreen } from "@/components/portal/auth/auth-screen";
import { DashboardView } from "@/components/portal/dashboard/dashboard-view";
import { ClientsView } from "@/components/portal/clients/clients-view";
import { ClientDetail } from "@/components/portal/clients/client-detail";
import { InboxView } from "@/components/portal/inbox/inbox-view";
import { ProjectsView } from "@/components/portal/projects/projects-view";
import { FilesView } from "@/components/portal/files/files-view";
import { ApprovalsView } from "@/components/portal/files/approvals-view";
import { FormsView } from "@/components/portal/forms/forms-view";
import { SettingsView } from "@/components/portal/settings/settings-view";
import { AuditView } from "@/components/portal/settings/audit-view";

class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode; view: string },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; view: string }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ViewErrorBoundary]", this.props.view, error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-rose/40 bg-rose/10 p-6 text-sm">
          <p className="font-semibold text-rose-foreground">
            Error rendering {this.props.view} view
          </p>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-xs scrollbar-thin">
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Check the browser console for the full component stack.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  const [mounted, setMounted] = React.useState(false);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const sessionToken = useAuth((s) => s.sessionToken);
  const authUser = useAuth((s) => s.user);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [verifying, setVerifying] = React.useState(false);

  // Check for ?token= in URL (magic link or invitation verification)
  React.useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setVerifying(true);
      (async () => {
        try {
          const res = await fetch("/api/auth/verify-magic-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();
          if (data.ok && data.sessionToken) {
            useAuth.getState().setSession(data.sessionToken, data.user);
            // Clean the URL
            window.history.replaceState({}, "", window.location.pathname);
            setVerifying(false);
          } else {
            console.error("Verification error:", data.error);
            setVerifying(false);
          }
        } catch (err) {
          console.error("Magic link verification failed", err);
          setVerifying(false);
        }
      })();
    }
  }, [mounted]);

  if (!mounted || verifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {verifying && (
          <div className="text-center">
            <p className="text-sm font-medium">Verifying your invitation & email ownership…</p>
            <p className="text-xs text-muted-foreground mt-1">Activating your project workspace access</p>
          </div>
        )}
      </div>
    );
  }

  // Not authenticated → show auth screen
  if (!isAuthenticated) {
    return (
      <QueryProvider>
        <AuthScreen />
      </QueryProvider>
    );
  }

  // Authenticated → show the main app
  return (
    <QueryProvider>
      <BootstrapUser user={authUser} />
      <GotoShortcutsBootstrap />
      <AppShell>
        <ViewRouterWithBoundary />
      </AppShell>
      <CommandPalette />
      <ShortcutHelpOverlay />
      <FocusTimer />
    </QueryProvider>
  );
}

function BootstrapUser({
  user,
}: {
  user: {
    id?: string;
    email: string;
    fullName: string;
    role: string;
    clientId?: string | null;
    clientName?: string | null;
  } | null;
}) {
  const setUser = useCurrentUser((s) => s.setUser);
  React.useEffect(() => {
    if (user) {
      setUser({
        id: user.id || user.email,
        email: user.email,
        fullName: user.fullName,
        role: user.role as "owner" | "admin" | "member" | "client",
        clientId: user.clientId,
        clientName: user.clientName,
      });
    }
  }, [user, setUser]);
  return null;
}

function GotoShortcutsBootstrap() {
  useNavGotoShortcuts();
  return null;
}

function ViewRouterWithBoundary() {
  const view = useNav((s) => s.view);
  const clientId = useNav((s) => s.clientId);

  return (
    <ViewErrorBoundary view={view}>
      {view === "dashboard" ? (
        <DashboardView />
      ) : view === "clients" ? (
        <ClientsView />
      ) : view === "client" && clientId ? (
        <ClientDetail clientId={clientId} />
      ) : view === "inbox" ? (
        <InboxView />
      ) : view === "projects" ? (
        <ProjectsView />
      ) : view === "files" ? (
        <FilesView />
      ) : view === "approvals" ? (
        <ApprovalsView />
      ) : view === "forms" ? (
        <FormsView />
      ) : view === "settings" ? (
        <SettingsView />
      ) : view === "audit" ? (
        <AuditView />
      ) : (
        <DashboardView />
      )}
    </ViewErrorBoundary>
  );
}
