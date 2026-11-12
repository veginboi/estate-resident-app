import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./api";

type Session = {
  /** null while the saved token is being read at startup */
  signedIn: boolean | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: Parameters<typeof api.register>[0]) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    tokenStore.get().then((token) => setSignedIn(!!token));
    setUnauthorizedHandler(() => setSignedIn(false));
  }, []);

  const value = useMemo<Session>(
    () => ({
      signedIn,
      signIn: async (email, password) => {
        await api.login(email, password);
        setSignedIn(true);
      },
      signUp: async (data) => {
        await api.register(data);
        setSignedIn(true);
      },
      signOut: async () => {
        await api.logout();
        setSignedIn(false);
      },
    }),
    [signedIn],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
