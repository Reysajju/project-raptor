"use client";

import * as React from "react";
import { useNav } from "@/components/portal/nav-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationsTab } from "./integrations-tab";
import { TeamTab } from "./team-tab";
import { GeneralTab } from "./general-tab";

export function SettingsView() {
  const tab = useNav((s) => s.settingsTab);
  const setTab = useNav((s) => s.setSettingsTab);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage integrations, team members, and workspace preferences.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-9 w-fit">
          <TabsTrigger value="integrations" className="px-3 text-xs sm:text-sm">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="team" className="px-3 text-xs sm:text-sm">
            Team
          </TabsTrigger>
          <TabsTrigger value="general" className="px-3 text-xs sm:text-sm">
            General
          </TabsTrigger>
        </TabsList>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <TeamTab />
        </TabsContent>
        <TabsContent value="general" className="mt-4">
          <GeneralTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
