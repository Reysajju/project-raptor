"use client";

import * as React from "react";

/**
 * A usePersistentState hook that syncs to localStorage. Falls back to the
 * initial value when SSR or when localStorage is unavailable (e.g. privacy
 * mode). Safe to use in client components.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = React.useState<T>(initialValue);

  // Hydrate from localStorage after mount (avoids SSR hydration mismatch).
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setState(JSON.parse(raw) as T);
      }
    } catch {
      // ignore — privacy mode or JSON parse failure
    }
  }, [key]);

  // Persist on change.
  const setValue = React.useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next =
          typeof value === "function"
            ? (value as (p: T) => T)(prev)
            : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore — quota or privacy mode
        }
        return next;
      });
    },
    [key]
  );

  return [state, setValue];
}
