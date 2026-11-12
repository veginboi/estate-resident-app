import { useEffect, useRef } from "react";
import { AppState } from "react-native";

/**
 * Calls `fn` every `ms` milliseconds while the app is in the foreground, and once straight
 * away when it comes back to the foreground. Pass `null` as `ms` to pause.
 */
export function usePolling(fn: () => unknown, ms: number | null) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    if (ms === null) return;
    const timer = setInterval(() => {
      if (AppState.currentState === "active") saved.current();
    }, ms);
    const sub = AppState.addEventListener("change", (state) => state === "active" && saved.current());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ms]);
}
