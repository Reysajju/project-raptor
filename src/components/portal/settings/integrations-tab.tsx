"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MessageSquare,
  Zap,
  RefreshCw,
  Plug,
  PlugZap,
  Send,
  AlertTriangle,
  Radio,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { StatusBadge } from "@/components/portal/common/status-badge";
import { apiGet, apiPatch, apiPost, useQueryState } from "@/components/portal/query-hooks";
import { relativeTime } from "@/lib/format";
import type {
  IntegrationsResponse,
  SimulatorResponse,
  WebhooksResponse,
  SimulatorScenario,
} from "./types";

const PROVIDER_META: Record<
  string,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string; // bg-tinted circle classes for the icon
    supportsWatch: boolean;
  }
> = {
  gmail: {
    name: "Gmail",
    icon: Mail,
    iconClass: "bg-rose/20 text-rose-foreground",
    supportsWatch: true,
  },
  openphone: {
    name: "OpenPhone",
    icon: Phone,
    iconClass: "bg-emerald/20 text-emerald-foreground",
    supportsWatch: false,
  },
  ringcentral: {
    name: "RingCentral",
    icon: MessageSquare,
    iconClass: "bg-accent/30 text-accent-foreground",
    supportsWatch: true,
  },
};

function providerMeta(provider: string) {
  return (
    PROVIDER_META[provider] ?? {
      name: provider,
      icon: Zap,
      iconClass: "bg-muted text-muted-foreground",
      supportsWatch: false,
    }
  );
}

function isExpiringSoon(dateStr: string | null, days = 3): boolean {
  if (!dateStr) return false;
  const expiresAt = new Date(dateStr).getTime();
  const now = Date.now();
  return expiresAt - now < days * 24 * 60 * 60 * 1000;
}

export function IntegrationsTab() {
  const integrationsQuery = useQueryState<IntegrationsResponse>("integrations");
  const webhooksQuery = useQueryState<WebhooksResponse>("webhooks");
  const qc = useQueryClient();

  const [scenarios, setScenarios] = React.useState<SimulatorScenario[]>([]);
  const [picked, setPicked] = React.useState<string>("");
  const [firing, setFiring] = React.useState(false);

  // Load simulator scenarios once.
  React.useEffect(() => {
    apiGet<SimulatorResponse>("/api/portal/simulator")
      .then((data) => {
        setScenarios(data.scenarios);
        if (data.scenarios[0]) setPicked(data.scenarios[0].id);
      })
      .catch(() => {
        /* ignore — toast shown on fire */
      });
  }, []);

  const integrations = integrationsQuery.data?.integrations ?? [];
  const events = webhooksQuery.data?.events ?? [];

  const handleSync = async (provider: string) => {
    try {
      await apiPatch(`/api/portal/integrations/${provider}`, {
        lastSyncAt: new Date().toISOString(),
      });
      toast.success(`${providerMeta(provider).name} synced`);
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error("Sync failed", { description: (err as Error).message });
    }
  };

  const handleToggleConnect = async (provider: string, current: string) => {
    const next = current === "connected" ? "disconnected" : "connected";
    try {
      await apiPatch(`/api/portal/integrations/${provider}`, { status: next });
      toast.success(
        next === "connected"
          ? `${providerMeta(provider).name} connected`
          : `${providerMeta(provider).name} disconnected`
      );
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error("Update failed", { description: (err as Error).message });
    }
  };

  const handleReconnect = async (provider: string) => {
    try {
      await apiPatch(`/api/portal/integrations/${provider}`, {
        status: "connected",
        lastSyncAt: new Date().toISOString(),
      });
      toast.success(`${providerMeta(provider).name} reconnected`);
      qc.invalidateQueries({ queryKey: ["integrations"] });
    } catch (err) {
      toast.error("Reconnect failed", { description: (err as Error).message });
    }
  };

  const handleFire = async () => {
    if (!picked) return;
    // Scenario IDs look like "gmail-email-northwind". Split on first dash to
    // get provider + scenario for the POST body.
    const dashIdx = picked.indexOf("-");
    const provider = picked.slice(0, dashIdx);
    const scenario = picked.slice(dashIdx + 1);
    setFiring(true);
    try {
      toast.success("Webhook fired — checking timeline…");
      await apiPost("/api/portal/simulator", { provider, scenario });
      // Invalidate the entire pipeline so the dashboard "open items" count
      // updates, the inbox reflects the new comm, and the webhook log shows
      // the new event.
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["inbox-counts"] });
      qc.invalidateQueries({ queryKey: ["communications"] });
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    } catch (err) {
      toast.error("Webhook failed", { description: (err as Error).message });
    } finally {
      setFiring(false);
    }
  };

  if (integrationsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect mock email, SMS, and telephony providers. Use the simulator below to
          exercise the webhook ingest pipeline end-to-end.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {integrations.map((integ, i) => {
          const meta = providerMeta(integ.provider);
          const Icon = meta.icon;
          return (
            <motion.div
              key={integ.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Card className="surface-highlight h-full py-0">
                <CardHeader className="gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.iconClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-sm">{meta.name}</CardTitle>
                        <CardDescription className="truncate text-[11px]">
                          {integ.accountLabel || "Not connected"}
                        </CardDescription>
                      </div>
                    </div>
                    <StatusBadge status={integ.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Last sync
                      </p>
                      <p className="mt-0.5 font-medium">
                        {integ.lastSyncAt ? relativeTime(integ.lastSyncAt) : "Never"}
                      </p>
                    </div>
                    {meta.supportsWatch ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Watch expiry
                        </p>
                        <p
                          className={`mt-0.5 flex items-center gap-1 font-medium ${
                            isExpiringSoon(integ.watchExpiresAt)
                              ? "text-amber-foreground"
                              : ""
                          }`}
                        >
                          {isExpiringSoon(integ.watchExpiresAt) ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : null}
                          {integ.watchExpiresAt
                            ? relativeTime(integ.watchExpiresAt)
                            : "—"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Type
                        </p>
                        <p className="mt-0.5 font-medium">SMS / Telephony</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => handleSync(integ.provider)}
                      disabled={integ.status !== "connected"}
                    >
                      <RefreshCw className="h-3 w-3" /> Sync now
                    </Button>
                    <Button
                      variant={integ.status === "connected" ? "secondary" : "default"}
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        handleToggleConnect(integ.provider, integ.status)
                      }
                    >
                      {integ.status === "connected" ? (
                        <>
                          <PlugZap className="h-3 w-3" /> Disconnect
                        </>
                      ) : (
                        <>
                          <Plug className="h-3 w-3" /> Connect
                        </>
                      )}
                    </Button>
                    {integ.status === "error" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleReconnect(integ.provider)}
                      >
                        <RefreshCw className="h-3 w-3" /> Reconnect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Webhook simulator */}
      <Card className="surface-highlight py-0">
        <CardHeader className="gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/30 text-accent-foreground">
                <Radio className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-sm">Webhook simulator</CardTitle>
                <CardDescription className="text-[11px]">
                  Fire mock inbound events. The simulator POSTs to{" "}
                  <code className="rounded bg-muted px-1 font-mono text-[10px]">
                    /api/portal/webhooks
                  </code>{" "}
                  which normalizes them into a real communications row.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Scenario
              </label>
              <Select value={picked} onValueChange={setPicked}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Pick a scenario…" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="text-xs">{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-9 gap-1.5"
              onClick={handleFire}
              disabled={!picked || firing}
            >
              {firing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Fire event
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook events log */}
      <Card className="py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
          <div>
            <CardTitle className="text-sm">Webhook events log</CardTitle>
            <CardDescription className="text-[11px]">
              Most recent events received by the ingest endpoint.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => webhooksQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No webhook events yet. Fire one above to see it appear here.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs">Event ID</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="py-2 text-xs capitalize">
                        {e.provider}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-[11px]">
                        {e.eventId}
                      </TableCell>
                      <TableCell className="py-2 font-mono text-[11px] text-muted-foreground">
                        {e.eventType || "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="py-2 text-right text-[11px] text-muted-foreground">
                        {relativeTime(e.receivedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
