"use client";

import * as React from "react";
import { useNav } from "../nav-store";
import { useQueryState } from "../query-hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  KanbanSquare,
  Zap,
  ArrowUpRight,
  Activity,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Globe,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import {
  channelMeta,
  relativeTime,
  shortTime,
  type ChannelKind,
} from "@/lib/format";
import { ChannelIcon } from "../common/channel-icon";
import { StatusBadge } from "../common/status-badge";
import { CountUp } from "../common/count-up";
import { NextActionsWidget } from "./next-actions-widget";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";

interface DashboardData {
  kpis: {
    totalClients: number;
    activeClients: number;
    openComms: number;
    unassignedComms: number;
    unmatched: number;
    pendingApprovals: number;
    activeProjects: number;
    overdueTasks: number;
  };
  integrations: { provider: string; status: string; accountLabel: string; lastSyncAt: string | null; watchExpiresAt: string | null }[];
  byChannel: Record<string, number>;
  recentComms: {
    id: string;
    clientId: string | null;
    channel: string;
    direction: string;
    subject: string;
    bodyText: string;
    occurredAt: string;
    client: { id: string; name: string; company: string | null } | null;
  }[];
  staleOpenCount: number;
  recentClients: { id: string; name: string; company: string | null; status: string; tags: string; accentColor: string }[];
}

export function DashboardView() {
  const { data, isLoading } = useQueryState<DashboardData>("dashboard");
  const nav = useNav();

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const channelData = (Object.entries(data.byChannel) as [ChannelKind, number][]).map(
    ([k, v]) => ({
      channel: k,
      label: channelMeta[k].label,
      count: v,
      fill: channelMeta[k].dot,
    })
  );

  const totalByChannel = channelData.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Command center
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, Alex</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data.kpis.openComms} open items · {data.kpis.pendingApprovals} approvals awaiting
            decision · {data.staleOpenCount} clients with stale open threads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav.setView("inbox")}>
            <Inbox className="mr-1.5 h-3.5 w-3.5" /> Open inbox
          </Button>
          <Button size="sm" onClick={() => nav.setView("clients")}>
            <Users className="mr-1.5 h-3.5 w-3.5" /> View clients
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total clients"
          value={data.kpis.totalClients}
          hint={`${data.kpis.activeClients} active`}
          tone="violet"
          onClick={() => nav.setView("clients")}
        />
        <KpiCard
          icon={Inbox}
          label="Open items"
          value={data.kpis.openComms}
          hint={`${data.kpis.unassignedComms} unassigned · ${data.kpis.unmatched} unmatched`}
          tone="sky"
          onClick={() => nav.setView("inbox")}
        />
        <KpiCard
          icon={KanbanSquare}
          label="Active projects"
          value={data.kpis.activeProjects}
          hint={`${data.kpis.overdueTasks} overdue tasks`}
          tone={data.kpis.overdueTasks > 0 ? "rose" : "emerald"}
          onClick={() => nav.setView("projects")}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Pending approvals"
          value={data.kpis.pendingApprovals}
          hint="Awaiting client decision"
          tone="amber"
          onClick={() => nav.setView("approvals")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Recent activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
              <CardDescription className="text-xs">
                Latest communications across all clients
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => nav.setView("inbox")}>
              View all <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {data.recentComms.slice(0, 8).map((c, i) => {
                const meta = channelMeta[c.channel as ChannelKind] ?? channelMeta.system;
                const clientName = c.client?.name ?? "Unmatched sender";
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <ChannelIcon channel={c.channel as ChannelKind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {c.client ? (
                            <button
                              className="hover:underline"
                              onClick={() => c.client && nav.openClient(c.client.id)}
                            >
                              {clientName}
                            </button>
                          ) : (
                            <span className="text-amber-foreground">{clientName}</span>
                          )}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {shortTime(c.occurredAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex min-w-0 items-baseline">
                              <span className={`mr-1.5 shrink-0 font-medium ${meta.color}`}>{meta.label}</span>
                              <span className="truncate">
                                {c.subject ? `${c.subject} — ` : ""}
                                {c.bodyText}
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-md">
                            <span className="block whitespace-pre-wrap text-xs">
                              {c.subject ? `${c.subject} — ` : ""}
                              {c.bodyText}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Channel mix chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Channel mix</CardTitle>
            <CardDescription className="text-xs">
              All client communications by channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    allowDecimals={false}
                    interval={0}
                  />
                  <RTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {channelData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {channelData.map((c) => {
                const pct = Math.round((c.count / totalByChannel) * 100);
                return (
                  <div key={c.channel} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: c.fill }}
                      aria-hidden
                    />
                    <span className="flex-1 text-muted-foreground">{c.label}</span>
                    <span className="font-mono text-foreground">{c.count}</span>
                    <span className="w-9 text-right text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Integrations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <CardDescription className="text-xs">
              Realtime provider status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.integrations.map((i) => (
              <div
                key={i.provider}
                className="flex items-center gap-3 rounded-md border border-border p-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                  <ProviderIcon provider={i.provider} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">{i.provider}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {i.accountLabel || "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <StatusBadge status={i.status} />
                  <p className="text-[10px] text-muted-foreground">
                    {i.lastSyncAt ? `synced ${relativeTime(i.lastSyncAt)}` : "never"}
                  </p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => nav.setView("settings")}>
              Manage integrations
            </Button>
          </CardContent>
        </Card>

        {/* At-risk / stale */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-foreground" />
              <CardTitle className="text-sm font-medium">Needs attention</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Clients with open threads &gt; 24h, overdue tasks, pending approvals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.staleOpenCount > 0 && (
              <div className="rounded-md border border-amber/60 bg-amber/30 p-3">
                <p className="text-sm font-medium text-amber-foreground">
                  {data.staleOpenCount} client(s) with stale open threads
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Open items older than 24 hours. Triage them in the inbox.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => nav.setView("inbox")}
                >
                  Triage now
                </Button>
              </div>
            )}
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">Recent clients</p>
              <ul className="mt-2 divide-y divide-border">
                {data.recentClients.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 py-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-accent text-[10px] text-accent-foreground">
                        {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                      onClick={() => nav.openClient(c.id)}
                    >
                      {c.name}
                      {c.company && <span className="text-muted-foreground"> · {c.company}</span>}
                    </button>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggested next actions */}
      <NextActionsWidget />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone: "violet" | "sky" | "emerald" | "amber" | "rose";
  onClick?: () => void;
}) {
  const toneRing: Record<string, string> = {
    violet: "text-accent-foreground bg-accent",
    sky: "text-sky-foreground bg-sky",
    emerald: "text-emerald-foreground bg-emerald",
    amber: "text-amber-foreground bg-amber",
    rose: "text-rose-foreground bg-rose",
  };
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-3 text-left transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 surface-highlight"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular">
            <CountUp value={value} />
          </p>
        </div>
        <span
          className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${toneRing[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="relative mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </button>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "gmail":
      return <Mail className="h-4 w-4" />;
    case "openphone":
      return <Phone className="h-4 w-4" />;
    case "ringcentral":
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="h-3 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card lg:col-span-2" />
        <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}
