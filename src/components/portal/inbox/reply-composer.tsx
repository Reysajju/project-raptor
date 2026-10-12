"use client";

import * as React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiPost } from "../query-hooks";
import { useNav } from "../nav-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  StickyNote,
  Globe,
  Mail,
  MessageSquare,
  Send,
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AiDraftButton } from "../common/ai-assistant";
import type { Communication } from "./types";

type ComposerTab = "note" | "portal" | "email" | "sms";

interface ReplyComposerProps {
  threadId: string;
  threadKey: string | null;
  clientId: string;
  /**
   * Forwarded ref to the textarea so the parent can focus it via the "R"
   * keyboard shortcut.
   */
  focusRef?: React.RefObject<HTMLTextAreaElement | null>;
  invalidateInbox: () => void;
  /** Called after a send completes successfully (to scroll timeline to end). */
  onSent?: (comm: Communication) => void;
}

export function ReplyComposer({
  threadId,
  threadKey,
  clientId,
  focusRef,
  invalidateInbox,
  onSent,
}: ReplyComposerProps) {
  const [tab, setTab] = React.useState<ComposerTab>("note");
  const [body, setBody] = React.useState("");
  const queryClient = useQueryClient();
  const nav = useNav();
  // Always create a local ref so the rules-of-hooks order is stable. The
  // parent can pass an external ref to focus; otherwise we use this one.
  const localTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = focusRef ?? localTextareaRef;

  const send = useMutation({
    mutationFn: (vars: { channel: string; direction: string; visibleToClient: boolean }) =>
      apiPost<{ communication: Communication }>("/api/portal/communications", {
        clientId,
        channel: vars.channel,
        direction: vars.direction,
        provider: vars.channel === "portal" ? "portal" : "manual",
        threadKey: threadKey ?? threadId,
        bodyText: body,
        bodyHtmlSanitized: body,
        status: "open",
        visibleToClient: vars.visibleToClient,
        occurredAt: new Date().toISOString(),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({
        queryKey: ["inbox-thread-comms", threadId],
      });
      const optimistic: Communication = {
        id: `optimistic-${Date.now()}`,
        clientId,
        channel: vars.channel,
        direction: vars.direction,
        provider: vars.channel === "portal" ? "portal" : "manual",
        providerMessageId: null,
        threadKey: threadKey ?? threadId,
        subject: "",
        bodyText: body,
        bodyHtmlSanitized: body,
        summary: null,
        transcript: null,
        audioUrl: null,
        durationSec: null,
        fromValue: "support@onboardwithus.com",
        toValue: "",
        status: "open",
        assignedTo: null,
        visibleToClient: vars.visibleToClient,
        occurredAt: new Date().toISOString(),
        client: null,
        assignee: null,
        attachments: [],
      };
      const keys = queryClient.getQueriesData<{ communications: Communication[] }>({
        queryKey: ["inbox-thread-comms", threadId],
      });
      for (const [key, value] of keys) {
        if (value) {
          queryClient.setQueryData<{ communications: Communication[] }>(key, {
            ...value,
            communications: [...(value.communications ?? []), optimistic],
          });
        }
      }
      return { optimistic };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.optimistic) {
        // Roll back optimistic insert.
        queryClient.invalidateQueries({
          queryKey: ["inbox-thread-comms", threadId],
        });
      }
      toast.error("Send failed", { description: err.message });
    },
    onSuccess: (data) => {
      toast.success("Sent", { description: "Your message was logged." });
      invalidateInbox();
      void queryClient.invalidateQueries({
        queryKey: ["inbox-thread-comms", threadId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["inbox-thread-latest", threadId],
      });
      onSent?.(data.communication);
    },
  });

  const sendFor = (channel: "note" | "portal") => {
    if (!body.trim()) {
      toast.error("Cannot send empty message");
      return;
    }
    if (channel === "note") {
      send.mutate({ channel: "note", direction: "internal", visibleToClient: false });
    } else {
      send.mutate({ channel: "portal", direction: "outbound", visibleToClient: true });
    }
    setBody("");
  };

  const isSendable = tab === "note" || tab === "portal";

  return (
    <div className="border-t border-border bg-card/80 p-3 backdrop-blur-sm">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ComposerTab)}
        className="w-full"
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-8">
            <TabsTrigger value="note" className="gap-1 text-xs">
              <StickyNote className="h-3 w-3" /> Note
            </TabsTrigger>
            <TabsTrigger value="portal" className="gap-1 text-xs">
              <Globe className="h-3 w-3" /> Portal
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1 text-xs">
              <Mail className="h-3 w-3" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1 text-xs">
              <MessageSquare className="h-3 w-3" /> SMS
            </TabsTrigger>
          </TabsList>
          <span className="text-[11px] text-muted-foreground">
            ⌘ + Enter to send
          </span>
        </div>

        <TabsContent value="note" className="mt-2">
          <ComposerInput
            textareaRef={textareaRef}
            value={body}
            onChange={setBody}
            onSend={() => sendFor("note")}
            sending={send.isPending}
            placeholder="Internal note — not visible to the client…"
            sendLabel="Save note"
            clientId={clientId}
            channel="note"
          />
        </TabsContent>

        <TabsContent value="portal" className="mt-2">
          <ComposerInput
            textareaRef={textareaRef}
            value={body}
            onChange={setBody}
            onSend={() => sendFor("portal")}
            sending={send.isPending}
            placeholder="Reply via the client portal — visible to the client…"
            sendLabel="Send to client"
            clientId={clientId}
            channel="portal"
          />
        </TabsContent>

        <TabsContent value="email" className="mt-2">
          <ProviderHint provider="gmail" />
        </TabsContent>

        <TabsContent value="sms" className="mt-2">
          <ProviderHint provider="openphone" />
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {isSendable && body.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="px-1 pt-1 text-[11px] text-muted-foreground">
              {tab === "portal"
                ? "Client will see this in their portal."
                : "Note is internal only."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden submit-key handler is wired per-textarea via onKeyDown. */}
      <span className="sr-only">{isSendable ? "send" : "no-send"}</span>
    </div>
  );
}

function ComposerInput({
  textareaRef,
  value,
  onChange,
  onSend,
  sending,
  placeholder,
  sendLabel,
  clientId,
  channel,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  placeholder: string;
  sendLabel: string;
  clientId: string;
  channel: "note" | "portal";
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="min-h-[80px] resize-y bg-background"
        aria-label={placeholder}
      />
      <div className="flex items-center justify-end gap-2">
        <AiDraftButton
          clientId={clientId}
          channel={channel}
          onApply={onChange}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => onChange("")}
          disabled={!value || sending}
        >
          Clear
        </Button>
        <Button
          size="sm"
          className="h-8"
          onClick={onSend}
          disabled={!value || sending}
        >
          {sending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-3.5 w-3.5" />
          )}
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}

function ProviderHint({ provider }: { provider: string }) {
  const nav = useNav();
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <SettingsIcon className="h-3.5 w-3.5" />
        <span className="font-medium">Connect {provider} in Settings</span>
      </div>
      <p className="text-muted-foreground">
        Email and SMS replies require a connected provider. Hook up Gmail or
        OpenPhone in Settings to send outbound messages directly from this
        thread.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={() => {
          nav.setView("settings");
        }}
      >
        <SettingsIcon className="mr-1.5 h-3 w-3" />
        Open Settings
      </Button>
    </div>
  );
}
