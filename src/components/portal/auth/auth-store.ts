"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isDemo: boolean;
  clientId?: string | null;
  clientName?: string | null;
}

interface AuthState {
  sessionToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      sessionToken: null,
      user: null,
      isAuthenticated: false,
      setSession: (token, user) =>
        set({ sessionToken: token, user, isAuthenticated: true }),
      logout: () =>
        set({ sessionToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "raptor:auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage)
      ),
    }
  )
);
