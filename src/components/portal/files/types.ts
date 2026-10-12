/**
 * Shared types for the Files + Approvals feature folder.
 * These mirror the JSON shapes returned by the portal API routes
 * (see /api/portal/files, /api/portal/approvals, /api/portal/clients,
 * /api/portal/projects).
 */

export interface ClientRef {
  id: string;
  name: string;
  company?: string | null;
  accentColor?: string | null;
}

export interface ProjectRef {
  id: string;
  title: string;
}

export interface ProfileRef {
  id: string;
  fullName: string;
}

export interface FileItem {
  id: string;
  clientId: string;
  projectId: string | null;
  folder: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  uploadedById: string | null;
  sharedWithClient: boolean;
  createdAt: string;
  updatedAt: string;
  client?: ClientRef | null;
  project?: ProjectRef | null;
  uploader?: ProfileRef | null;
}

export interface FilesResponse {
  files: FileItem[];
  totalBytes: number;
  count: number;
}

export interface Approval {
  id: string;
  clientId: string;
  projectId: string | null;
  fileId: string | null;
  title: string;
  status: "pending" | "approved" | "changes_requested" | string;
  decidedById: string | null;
  decidedAt: string | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
  client?: ClientRef | null;
  project?: ProjectRef | null;
  file?: { id: string; fileName: string; mimeType: string } | null;
  decider?: ProfileRef | null;
}

export interface ApprovalsResponse {
  approvals: Approval[];
}

export interface ClientListItem {
  id: string;
  name: string;
  company: string | null;
  status: string;
  tags: string[];
  ownerId: string | null;
  accentColor: string;
  openItems: number;
  activeProjects: number;
  fileCount: number;
  updatedAt: string;
}

export interface ClientsResponse {
  clients: ClientListItem[];
}

export interface ProjectListItem {
  id: string;
  clientId: string;
  title: string;
  status: string;
  stage: string;
  dueDate: string | null;
  position: number;
}

export interface ProjectsResponse {
  projects: ProjectListItem[];
  byStage: Record<string, ProjectListItem[]>;
}

/** 1 GB cap, expressed in bytes (1024 * 1024 * 1024). */
export const STORAGE_CAP_BYTES = 1024 * 1024 * 1024;
/** Same cap expressed in MB (1024). */
export const STORAGE_CAP_MB = 1024;
