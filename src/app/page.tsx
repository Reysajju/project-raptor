"use client";

import * as React from "react";
import { AppShell } from "@/components/portal/app-shell";
import { QueryProvider } from "@/components/portal/query-provider";
import { useCurrentUser } from "@/components/portal/user-store";
import { useNav } from "@/components/portal/nav-store";
import { CommandPalette } from "@/components/portal/command/command-palette";
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
  return (
    <QueryProvider>
      <BootstrapUser />
      <AppShell>
        <ViewRouterWithBoundary />
      </AppShell>
      <CommandPalette />
    </QueryProvider>
  );
}

function BootstrapUser() {
  const setUser = useCurrentUser((s) => s.setUser);
  React.useEffect(() => {
    setUser({
      id: "owner",
      email: "alex@onboardwithus.com",
      fullName: "Alex Mercer",
      role: "owner",
    });
  }, [setUser]);
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
