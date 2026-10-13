"use client";

import { create } from "zustand";

/**
 * Shared dashboard state for cross-widget communication.
 * Currently used to sync the heatmap's selected day with the recent activity
 * feed so clicking a heatmap day filters the feed.
 */
interface DashboardState {
  /** ISO date string (YYYY-MM-DD) or null when no day is selected. */
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  toggleDate: (date: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleDate: (date) => {
    const current = get().selectedDate;
    set({ selectedDate: current === date ? null : date });
  },
}));
