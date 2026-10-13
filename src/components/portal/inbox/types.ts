"use client";

/**
 * Shared types for the shared inbox feature. These mirror the JSON shapes
 * returned by /api/portal/inbox, /api/portal/communications, etc.
 */

export type InboxFilter =
  | "all"
  | "mine"
  | "unassigned"
  | "unmatched"
  | "snoozed"
  | "done";

export const INBOX_FILTERS: InboxFilter[] = [
  "all",
  "mine",
  "unassigned",
  "unmatched",
  "snoozed",
  "done",
];

export interface InboxThread {
  id: string;
  threadKey: string;
  channel: string;
  direction: string;
  subject: string;
  preview: string;
  fromValue: string;
  occurredAt: string;
  status: string;
  clientId: string | null;
  client: {
    id: string;
    name: string;
    company: string | null;
    accentColor: string;
  } | null;
  assignee: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  provider: string | null;
  visibleToClient: boolean;
}

export interface InboxResponse {
  threads: InboxThread[];
  filter: string;
}

export interface InboxCounts {
  open: number;
  unassigned: number;
  unmatched: number;
  snoozed: number;
  done: number;
  mine: number;
}

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  clientId: string | null;
}

export interface TeamResponse {
  team: TeamMember[];
}

export interface ClientListItem {
  id: string;
  name: string;
  company: string | null;
  status: string;
  accentColor: string;
  tags: string[];
  contacts: {
    id: string;
    type: string;
    value: string;
    label: string;
    isPrimary: boolean;
  }[];
}

export interface ClientsResponse {
  clients: ClientListItem[];
}

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Communication {
  id: string;
  clientId: string | null;
  channel: string;
  direction: string;
  provider: string;
  providerMessageId: string | null;
  threadKey: string | null;
  subject: string;
  bodyText: string;
  bodyHtmlSanitized: string;
  summary: string | null;
  transcript: string | null;
  audioUrl: string | null;
  durationSec: number | null;
  fromValue: string;
  toValue: string;
  status: string;
  assignedTo: string | null;
  visibleToClient: boolean;
  occurredAt: string;
  client: {
    id: string;
    name: string;
    company: string | null;
    accentColor?: string;
  } | null;
  assignee: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  attachments: Attachment[];
}

export interface CommunicationResponse {
  communication: Communication;
}

export interface CommunicationsResponse {
  communications: Communication[];
}

/**
 * Sanitize an HTML string before rendering. Strips <script> tags and any
 * on* attribute handlers. This is a defense-in-depth layer on top of whatever
 * the backend already did (the API stores bodyHtmlSanitized, but we don't
 * trust that blindly on the client).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") {
    // Server render — just strip script tags via regex.
    return html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    });
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}
