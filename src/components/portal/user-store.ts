import { create } from "zustand";

/**
 * The "current user" for this single-tenant demo. In a real deployment this
 * would come from the session (NextAuth / Supabase). We default to the owner
 * so all admin features are visible.
 */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "admin" | "client";
}

interface UserState {
  user: CurrentUser | null;
  setUser: (u: CurrentUser | null) => void;
}

export const useCurrentUser = create<UserState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
}))
