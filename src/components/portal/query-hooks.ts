"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Tiny typed wrapper around fetch + TanStack Query. All portal data flows
 * through these so cache keys stay consistent and invalidations are central.
 */

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export function useQueryState<T>(key: string, path?: string, options?: { enabled?: boolean }) {
  return useQuery<T>({
    queryKey: [key],
    queryFn: () => apiGet<T>(path ?? `/api/portal/${key}`),
    enabled: options?.enabled,
  });
}

export function useApiMutation<T, V = unknown>(
  method: "POST" | "PATCH" | "DELETE",
  pathFn: (vars: V) => string,
  invalidateKeys: string[]
) {
  const qc = useQueryClient();
  return useMutation<T, Error, V>({
    mutationFn: (vars) => {
      if (method === "POST") return apiPost<T>(pathFn(vars), vars);
      if (method === "PATCH") return apiPatch<T>(pathFn(vars), vars);
      return apiDelete<T>(pathFn(vars));
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return React.useCallback(
    () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
    [qc, keys]
  );
}
