// Shared types for the Settings + Audit feature tabs.

export interface Integration {
  id: string;
  provider: string; // gmail | openphone | ringcentral
  status: string; // connected | disconnected | error
  accountLabel: string;
  lastSyncAt: string | null;
  watchExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationsResponse {
  integrations: Integration[];
}

export interface SimulatorScenario {
  id: string;
  provider: string;
  label: string;
}

export interface SimulatorResponse {
  scenarios: SimulatorScenario[];
}

export interface WebhookEvent {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  status: string; // received | processed | failed
  attempts: number;
  error: string | null;
  receivedAt: string;
  rawJson: Record<string, unknown>;
}

export interface WebhooksResponse {
  events: WebhookEvent[];
}

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string; // owner | admin
  avatarUrl: string | null;
  createdAt: string;
}

export interface TeamResponse {
  team: TeamMember[];
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export interface AuditResponse {
  logs: AuditLogEntry[];
}

export const AUDIT_ENTITIES = [
  { value: "all", label: "All entities" },
  { value: "client", label: "client" },
  { value: "communication", label: "communication" },
  { value: "file", label: "file" },
  { value: "approval", label: "approval" },
  { value: "integration", label: "integration" },
] as const;
