"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ViewKey =
  | "dashboard"
  | "clients"
  | "client"
  | "inbox"
  | "projects"
  | "files"
  | "approvals"
  | "forms"
  | "settings"
  | "audit";

export interface NavState {
  /** Top-level view shown in the main panel. */
  view: ViewKey;
  /** Active client id when view === "client". */
  clientId: string | null;
  /** Active client tab (timeline | projects | files | approvals | forms | details). */
  clientTab: string;
  /** Inbox filter (all | mine | unassigned | unmatched | snoozed | done). */
  inboxFilter: string;
  /** Active project id when view === "projects". */
  projectId: string | null;
  /** Settings tab (integrations | team | general). */
  settingsTab: string;
  /** Command palette open state. */
  commandOpen: boolean;
  /** Recent breadcrumb trail for the top bar. */
  trail: { label: string; view?: ViewKey; clientId?: string }[];
  /** Focus mode hides the sidebar for distraction-free work. */
  focusMode: boolean;

  setView: (view: ViewKey) => void;
  openClient: (clientId: string, tab?: string) => void;
  setClientTab: (tab: string) => void;
  setInboxFilter: (f: string) => void;
  openProject: (projectId: string) => void;
  setSettingsTab: (tab: string) => void;
  setCommandOpen: (open: boolean) => void;
  setTrail: (trail: NavState["trail"]) => void;
  goBack: () => void;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
}

export const useNav = create<NavState>()(
  persist(
    (set, get) => ({
      view: "dashboard",
      clientId: null,
      clientTab: "timeline",
      inboxFilter: "all",
      projectId: null,
      settingsTab: "email",
      commandOpen: false,
      trail: [{ label: "Dashboard" }],
      focusMode: false,

      setView: (view) =>
        set({
          view,
          trail:
            view === "dashboard"
              ? [{ label: "Dashboard" }]
              : [{ label: titleFor(view) }],
          clientId: view === "client" ? get().clientId : null,
        }),

      openClient: (clientId, tab = "timeline") =>
        set({
          view: "client",
          clientId,
          clientTab: tab,
          trail: [
            { label: "Clients", view: "clients" },
            { label: "Client", clientId },
          ],
        }),

      setClientTab: (tab) => set({ clientTab: tab }),

      setInboxFilter: (f) => set({ inboxFilter: f }),

      openProject: (projectId) =>
        set({ projectId, view: "projects", trail: [{ label: "Projects", view: "projects" }] }),

      setSettingsTab: (tab) => set({ settingsTab: tab }),

      setCommandOpen: (open) => set({ commandOpen: open }),

      setTrail: (trail) => set({ trail }),

      goBack: () => {
        const cur = get().view
        if (cur === "client") {
          set({ view: "clients", clientId: null, trail: [{ label: "Clients" }] })
        } else {
          set({ view: "dashboard", trail: [{ label: "Dashboard" }] })
        }
      },

      setFocusMode: (v) => set({ focusMode: v }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    {
      name: "portal:nav",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : undefined as unknown as Storage)),
      // Only persist user preferences — NOT view/clientId/trail (which depend
      // on live data and could point to a stale/missing client on reload).
      partialize: (s) => ({
        inboxFilter: s.inboxFilter,
        settingsTab: s.settingsTab,
        clientTab: s.clientTab,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NavState>;
        return {
          ...current,
          inboxFilter: p.inboxFilter ?? current.inboxFilter,
          settingsTab: p.settingsTab ?? current.settingsTab,
          clientTab: p.clientTab ?? current.clientTab,
        };
      },
    }
  )
)

function titleFor(v: ViewKey): string {
  switch (v) {
    case "dashboard": return "Dashboard"
    case "clients": return "Clients"
    case "client": return "Client"
    case "inbox": return "Inbox"
    case "projects": return "Projects"
    case "files": return "Files"
    case "approvals": return "Approvals"
    case "forms": return "Forms"
    case "settings": return "Settings"
    case "audit": return "Audit Log"
  }
}
