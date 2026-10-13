"use client";

import * as React from "react";
import {
  Bell,
  Mail,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePersistentState } from "@/lib/use-persistent-state";
import { cn } from "@/lib/utils";

interface NotifPref {
  inApp: boolean;
  email: boolean;
}

interface PrefConfig {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaults: NotifPref;
}

const PREFS: PrefConfig[] = [
  {
    key: "assignment",
    label: "Assignments",
    description: "When a communication or task is assigned to you",
    icon: Inbox,
    defaults: { inApp: true, email: true },
  },
  {
    key: "approval",
    label: "Approvals",
    description: "When a deliverable needs your sign-off or a decision is made",
    icon: CheckCircle2,
    defaults: { inApp: true, email: false },
  },
  {
    key: "triage",
    label: "Unmatched senders",
    description: "When an inbound message can't be matched to a client",
    icon: AlertTriangle,
    defaults: { inApp: true, email: false },
  },
  {
    key: "form",
    label: "Form submissions",
    description: "When a client submits an intake form response",
    icon: ClipboardList,
    defaults: { inApp: true, email: true },
  },
  {
    key: "sla",
    label: "SLA breaches",
    description: "Daily digest of clients breaching response-time SLAs",
    icon: Bell,
    defaults: { inApp: true, email: true },
  },
];

export function NotificationsPreferences() {
  return (
    <Card className="surface-highlight">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Bell className="h-3.5 w-3.5" />
          </span>
          Notification preferences
        </CardTitle>
        <CardDescription className="text-xs">
          Choose which events trigger in-app and email notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Header row */}
        <div className="flex items-center gap-4 px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className="flex-1">Event type</span>
          <span className="flex w-24 items-center justify-center gap-1">
            <Bell className="h-3 w-3" /> In-app
          </span>
          <span className="flex w-24 items-center justify-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </span>
        </div>
        {PREFS.map((p) => (
          <PrefRow key={p.key} config={p} />
        ))}
      </CardContent>
    </Card>
  );
}

function PrefRow({ config }: { config: PrefConfig }) {
  const [pref, setPref] = usePersistentState<NotifPref>(
    `portal:notif:${config.key}`,
    config.defaults
  );
  const Icon = config.icon;

  const toggle = (field: keyof NotifPref) => {
    setPref({ ...pref, [field]: !pref[field] });
  };

  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-card px-2 py-2.5 transition-colors hover:bg-muted/30">
      <div className="flex flex-1 items-center gap-2.5 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{config.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">{config.description}</p>
        </div>
      </div>
      <div className="flex w-24 justify-center">
        <Switch
          checked={pref.inApp}
          onCheckedChange={() => toggle("inApp")}
          aria-label={`In-app notifications for ${config.label}`}
        />
      </div>
      <div className="flex w-24 justify-center">
        <Switch
          checked={pref.email}
          onCheckedChange={() => toggle("email")}
          aria-label={`Email notifications for ${config.label}`}
        />
      </div>
    </div>
  );
}
