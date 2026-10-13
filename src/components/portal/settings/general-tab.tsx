"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Sun, Moon, Monitor, AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NotificationsPreferences } from "./notifications-preferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ACCENT_OPTIONS = [
  { value: "violet", label: "Violet", swatch: "bg-primary" },
  { value: "emerald", label: "Emerald", swatch: "bg-emerald-foreground" },
  { value: "sky", label: "Sky", swatch: "bg-sky-foreground" },
  { value: "amber", label: "Amber", swatch: "bg-amber-foreground" },
  { value: "rose", label: "Rose", swatch: "bg-rose-foreground" },
];

const LS_ORG = "portal:orgName";
const LS_ACCENT = "portal:accentColor";
const LS_RETENTION = "portal:trimPayloads";

export function GeneralTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [orgName, setOrgName] = React.useState("");
  const [accent, setAccent] = React.useState("violet");
  const [trim, setTrim] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);

  // Hydrate from localStorage on mount.
  React.useEffect(() => {
    try {
      setOrgName(localStorage.getItem(LS_ORG) ?? "Onboard With Us");
      setAccent(localStorage.getItem(LS_ACCENT) ?? "violet");
      setTrim(localStorage.getItem(LS_RETENTION) === "true");
    } catch {
      /* ignore */
    }
  }, []);

  const saveOrg = (val: string) => {
    setOrgName(val);
    try {
      localStorage.setItem(LS_ORG, val);
    } catch {
      /* ignore */
    }
  };

  const saveAccent = (val: string) => {
    setAccent(val);
    try {
      localStorage.setItem(LS_ACCENT, val);
    } catch {
      /* ignore */
    }
    toast.success(`Accent color set to ${val}`);
  };

  const handleTrimToggle = (next: boolean) => {
    setTrim(next);
    try {
      localStorage.setItem(LS_RETENTION, String(next));
    } catch {
      /* ignore */
    }
    toast.success(
      next
        ? "Trim enabled — payloads > 30 days will be purged (demo)"
        : "Trim disabled (demo)"
    );
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">General</h2>
        <p className="text-sm text-muted-foreground">
          Workspace-level preferences. Stored locally for this demo session.
        </p>
      </header>

      {/* Organization */}
      <Card className="surface-highlight py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Organization</CardTitle>
          <CardDescription className="text-[11px]">
            Used in the top bar, emails, and exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => saveOrg(e.target.value)}
              placeholder="Onboard With Us"
              className="max-w-md"
            />
            <p className="text-[10px] text-muted-foreground">
              Saved to <code className="rounded bg-muted px-1 font-mono">localStorage</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="surface-highlight py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Appearance</CardTitle>
          <CardDescription className="text-[11px]">
            Choose how the portal looks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default accent color</Label>
            <Select value={accent} onValueChange={saveAccent}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", opt.swatch)} />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <ThemeButton
                active={mounted && theme === "light"}
                onClick={() => setTheme("light")}
                icon={Sun}
                label="Light"
              />
              <ThemeButton
                active={mounted && theme === "dark"}
                onClick={() => setTheme("dark")}
                icon={Moon}
                label="Dark"
              />
              <ThemeButton
                active={mounted && theme === "system"}
                onClick={() => setTheme("system")}
                icon={Monitor}
                label="System"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data retention */}
      <Card className="surface-highlight py-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Data retention</CardTitle>
          <CardDescription className="text-[11px]">
            Control how long raw webhook payloads are kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">
                Trim raw webhook payloads older than 30 days
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Run nightly. Normalized communications are preserved; only raw
                payloads are removed.
              </p>
            </div>
            <Switch checked={trim} onCheckedChange={handleTrimToggle} />
          </label>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-rose/40 py-0">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-foreground" />
            <CardTitle className="text-sm text-rose-foreground">Danger zone</CardTitle>
          </div>
          <CardDescription className="text-[11px]">
            Destructive actions can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose/40 bg-rose/10 p-3">
            <div>
              <p className="text-sm font-medium">Reset demo data</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Re-seed the database to its initial state.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setResetOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Reset demo data
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will wipe and reseed clients, communications, projects,
              files, approvals, forms, integrations, webhooks, and audit log.
              The reset happens on the server — run{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                bun run scripts/seed.ts
              </code>{" "}
              to reseed manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setResetOpen(false);
                toast.success("Run `bun run scripts/seed.ts` to reseed", {
                  description:
                    "The reset endpoint isn't wired in this demo — reseed via the script.",
                });
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification preferences */}
      <NotificationsPreferences />
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 flex-col items-center justify-center gap-1 rounded-md border text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-accent/40 text-accent-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
      )}
      aria-pressed={active}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
