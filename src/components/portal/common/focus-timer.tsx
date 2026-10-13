"use client";

import * as React from "react";
import { Timer, X, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNav } from "@/components/portal/nav-store";
import { usePersistentState } from "@/lib/use-persistent-state";
import { cn } from "@/lib/utils";

/**
 * Focus mode timer. When focus mode is on, shows a small floating timer
 * in the bottom-right corner with elapsed time, pause/resume, and exit.
 * The timer persists across reloads via localStorage (start timestamp).
 * Auto-exits after a configurable duration (default 25 min — Pomodoro-style).
 */
const FOCUS_DURATION_MIN = 25;

export function FocusTimer() {
  const focusMode = useNav((s) => s.focusMode);
  const setFocusMode = useNav((s) => s.setFocusMode);
  const [startTs, setStartTs] = usePersistentState<number | null>("portal:focus:startTs", null);
  const [paused, setPaused] = usePersistentState<boolean>("portal:focus:paused", false);
  const [pausedAt, setPausedAt] = usePersistentState<number | null>("portal:focus:pausedAt", null);
  const [elapsed, setElapsed] = React.useState(0);

  // Start the timer when focus mode turns on
  React.useEffect(() => {
    if (focusMode && !startTs) {
      const now = Date.now();
      setStartTs(now);
      setPaused(false);
      setPausedAt(null);
    }
  }, [focusMode, startTs, setStartTs, setPaused, setPausedAt]);

  // Clear when focus mode turns off
  React.useEffect(() => {
    if (!focusMode && startTs) {
      setStartTs(null);
      setPaused(false);
      setPausedAt(null);
    }
  }, [focusMode, startTs, setStartTs, setPaused, setPausedAt]);

  // Tick
  React.useEffect(() => {
    if (!focusMode || !startTs || paused) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTs;
      setElapsed(Math.floor(elapsedMs / 1000));
      // Auto-exit after FOCUS_DURATION_MIN
      if (elapsedMs >= FOCUS_DURATION_MIN * 60 * 1000) {
        setFocusMode(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [focusMode, startTs, paused, setFocusMode]);

  if (!focusMode || !startTs) return null;

  const remaining = Math.max(0, FOCUS_DURATION_MIN * 60 - elapsed);
  const pct = Math.min(100, (elapsed / (FOCUS_DURATION_MIN * 60)) * 100);
  const isComplete = remaining === 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePause = () => {
    if (paused) {
      // Resume: shift startTs forward by the paused duration
      if (pausedAt) {
        const pauseDuration = Date.now() - pausedAt;
        setStartTs(startTs + pauseDuration);
      }
      setPaused(false);
      setPausedAt(null);
    } else {
      setPaused(true);
      setPausedAt(Date.now());
    }
  };

  const exit = () => {
    setFocusMode(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-popover/95 px-3 py-1.5 shadow-lg backdrop-blur-md">
      <Timer className={cn("h-4 w-4", isComplete ? "text-emerald-foreground" : "text-primary")} />
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs tabular">
          {isComplete ? "Done!" : formatTime(remaining)}
        </span>
        {/* Progress ring */}
        <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--muted)" strokeWidth="2" />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 8}
            strokeDashoffset={2 * Math.PI * 8 * (1 - pct / 100)}
            className={cn("transition-all duration-1000", isComplete ? "text-emerald-foreground" : "text-primary")}
          />
        </svg>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={togglePause}
        aria-label={paused ? "Resume focus timer" : "Pause focus timer"}
      >
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={exit}
        aria-label="Exit focus mode"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
