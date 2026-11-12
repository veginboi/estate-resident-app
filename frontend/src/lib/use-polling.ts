"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `ms` milliseconds while the browser tab is visible, and once straight
 * away when the tab becomes visible again. Pass `null` as `ms` to pause.
 */
export function usePolling(fn: () => unknown, ms: number | null) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    if (ms === null) return;
    const tick = () => {
      if (document.visibilityState === "visible") saved.current();
    };
    const timer = window.setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms]);
}
