"use client";

import * as React from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useNav } from "../nav-store";
import { apiGet, apiPatch, apiPost, useQueryState } from "../query-hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Link2,
  UserPlus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { ClientsResponse, Communication, TeamMember } from "./types";

interface TriageCardProps {
  comm: Communication;
  /** Called after the comm is successfully linked to a client. */
  onLinked?: (clientId: string) => void;
  invalidateInbox: () => void;
}

export function TriageCard({ comm, onLinked, invalidateInbox }: TriageCardProps) {
  const fromValue = comm.fromValue || "Unknown sender";
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const queryClient = useQueryClient();

  const linkMutation = useMutation({
    mutationFn: (clientId: string) =>
      apiPatch<{ communication: Communication }>(
        `/api/portal/communications/${comm.id}`,
        { clientId },
      ),
    onSuccess: (_data, clientId) => {
      toast.success("Linked to client", {
        description: "The thread is now matched and visible in client views.",
      });
      invalidateInbox();
      void queryClient.invalidateQueries({
        queryKey: ["inbox-thread-latest", comm.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inbox-thread-comms", comm.id],
      });
      onLinked?.(clientId);
    },
    onError: (err: Error) =>
      toast.error("Could not link", { description: err.message }),
  });

  return (
    <Card
      className={cn(
        "border-amber/50 bg-amber/10",
        "surface-highlight",
      )}
      role="region"
      aria-label="Triage unmatched sender"
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber/40 text-amber-foreground">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-amber-foreground">
                Unmatched sender — triage
              </p>
              <Badge
                variant="outline"
                className="border-amber/60 bg-amber/20 text-[10px] text-amber-foreground"
              >
                {comm.channel}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Link this message to an existing client or create a new contact
              to continue the conversation in the portal.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/60 p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            From
          </p>
          <p className="mt-0.5 break-all font-mono text-xs text-foreground">
            {fromValue}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <LinkExistingClient
            commId={comm.id}
            onPick={(clientId) => linkMutation.mutate(clientId)}
            loading={linkMutation.isPending}
          />
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px]"
            onClick={() => setSheetOpen(true)}
            disabled={linkMutation.isPending}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Create new client from sender
          </Button>
        </div>
      </CardContent>

      <CreateClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        senderEmail={fromValue}
        onCreated={(clientId) => {
          setSheetOpen(false);
          linkMutation.mutate(clientId);
        }}
      />
    </Card>
  );
}

function LinkExistingClient({
  commId: _commId,
  onPick,
  loading,
}: {
  commId: string;
  onPick: (clientId: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useQueryState<ClientsResponse>("clients");
  const clients = data?.clients ?? [];
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!q.trim()) return clients;
    const needle = q.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.company ?? "").toLowerCase().includes(needle),
    );
  }, [q, clients]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="min-h-[40px]"
          disabled={loading}
          aria-haspopup="listbox"
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Link to existing client
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] max-w-[80vw] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search clients…"
            value={q}
            onValueChange={setQ}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading clients…" : "No clients found."}
            </CommandEmpty>
            <CommandGroup heading="Clients">
              {filtered.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onPick(c.id);
                    setOpen(false);
                  }}
                >
                  <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.company && (
                    <span className="truncate text-xs text-muted-foreground">
                      · {c.company}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CreateClientSheet({
  open,
  onOpenChange,
  senderEmail,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderEmail: string;
  onCreated: (clientId: string) => void;
}) {
  const queryClient = useQueryClient();
  const teamQuery = useQuery<{ team: TeamMember[] }>({
    queryKey: ["team"],
    queryFn: () => apiGet<{ team: TeamMember[] }>("/api/portal/team"),
  });
  const team = teamQuery.data?.team ?? [];
  const defaultOwner = team.find((m) => m.role === "owner") ?? team[0];

  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState(senderEmail);
  const [phone, setPhone] = React.useState("");
  const [status, setStatus] = React.useState("prospect");
  const [tags, setTags] = React.useState("smb,inbound");

  // Prefill email whenever senderEmail changes
  React.useEffect(() => {
    if (senderEmail && !email) setEmail(senderEmail);
  }, [senderEmail, email]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<{ client: { id: string } }>("/api/portal/clients", {
        name: name || senderEmail.split("@")[0] || "New client",
        company: company || null,
        status,
        tags,
        ownerId: defaultOwner?.id ?? null,
        accentColor: "violet",
        contacts: [
          { type: "email", value: email || senderEmail, label: "work", isPrimary: true },
          ...(phone
            ? [{ type: "phone", value: phone, label: "mobile", isPrimary: false }]
            : []),
        ],
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      onCreated(data.client.id);
    },
    onError: (err: Error) => {
      toast.error("Could not create client", { description: err.message });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto scrollbar-thin sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create new client from sender</SheetTitle>
          <SheetDescription>
            A new client record will be created with this sender's email as a
            primary contact, then the message will be linked to them.
          </SheetDescription>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 px-4 pb-4"
        >
          <div>
            <Label htmlFor="tc-name" className="text-xs">
              Name
            </Label>
            <Input
              id="tc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={senderEmail.split("@")[0] ?? "Jordan B"}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tc-company" className="text-xs">
              Company
            </Label>
            <Input
              id="tc-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Bright Books Accounting"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="tc-status" className="text-xs">
                Status
              </Label>
              <select
                id="tc-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={cn(
                  "mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tc-tags" className="text-xs">
                Tags (comma)
              </Label>
              <Input
                id="tc-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tc-email" className="text-xs">
              Email
            </Label>
            <Input
              id="tc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tc-phone" className="text-xs">
              Phone (optional)
            </Label>
            <Input
              id="tc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-foreground" />
              Owner: {defaultOwner?.fullName ?? "—"}
            </p>
          </div>
        </motion.div>

        <SheetFooter className="mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !email}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Create & link
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
