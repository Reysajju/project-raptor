// Shared types for the Forms feature.

export type FieldType =
  | "text"
  | "longtext"
  | "select"
  | "checkbox"
  | "date"
  | "file";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[];
}

export interface FormResponse {
  id: string;
  formId: string;
  clientId: string | null;
  answersJson: Record<string, unknown>;
  status: string;
  submittedAt: string;
  client: { id: string; name: string } | null;
}

export interface FormRecord {
  id: string;
  clientId: string | null;
  title: string;
  description: string;
  schemaJson: FormField[];
  status: string; // draft | published | archived
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; company: string | null } | null;
  responses: FormResponse[];
}

export interface FormsListResponse {
  forms: FormRecord[];
}

export interface ClientLite {
  id: string;
  name: string;
  company: string | null;
  status: string;
}

export interface ClientsListResponse {
  clients: ClientLite[];
}

export const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: "text", label: "Text", hint: "Single line input" },
  { value: "longtext", label: "Long text", hint: "Multi-line textarea" },
  { value: "select", label: "Select", hint: "Dropdown with options" },
  { value: "checkbox", label: "Checkbox", hint: "Boolean consent / agreement" },
  { value: "date", label: "Date", hint: "Date picker" },
  { value: "file", label: "File upload", hint: "Drag-drop upload zone" },
];
