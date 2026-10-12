"use client";

import * as React from "react";
import { useNav, type ViewKey } from "@/components/portal/nav-store";

/**
 * Implements the "G then letter" two-key navigation shortcuts (a la GitHub /
 * Linear). Press G, release, then press D/C/I/P/F/A/S within 700ms to jump
 * to that view. Does nothing when focus is in an input/textarea/contenteditable
 * or when a modifier key is held.
 */
const GOTO_MAP: Record<string, ViewKey> = {
  d: "dashboard",
  c: "clients",
  i: "inbox",
  p: "projects",
  f: "files",
  a: "approvals",
  s: "settings",
};

export function useNavGotoShortcuts() {
  const setView = useNav((s) => s.setView);
  const gPressedRef = React.useRef(false);
  const gTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;

      const key = e.key.toLowerCase();

      if (key === "g") {
        gPressedRef.current = true;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 700);
        return;
      }

      if (gPressedRef.current) {
        const view = GOTO_MAP[key];
        if (view) {
          e.preventDefault();
          setView(view);
        }
        gPressedRef.current = false;
        if (gTimerRef.current) {
          clearTimeout(gTimerRef.current);
          gTimerRef.current = null;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [setView]);
}
