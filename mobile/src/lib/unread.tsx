import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useSession } from "./session";
import { usePolling } from "./use-polling";

const BADGE_POLL_MS = 30000;

type Unread = { count: number; refresh: () => void };

const UnreadContext = createContext<Unread>({ count: 0, refresh: () => undefined });

/** Unread message count for the badges on the More tab and the Messages row. */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const { signedIn } = useSession();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!signedIn) return;
    api.getUnreadCount().then(setCount).catch(() => undefined);
  }, [signedIn]);

  useEffect(() => {
    if (signedIn) refresh();
    else setCount(0);
  }, [signedIn, refresh]);
  usePolling(refresh, signedIn ? BADGE_POLL_MS : null);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export const useUnread = () => useContext(UnreadContext);
