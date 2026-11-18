import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { AuthResponse } from "../api/schemas";

export type SessionStatus = "booting" | "authenticated" | "guest";

interface SessionValue {
  status: SessionStatus;
  /** Call after a successful login with the API's AuthResponse. */
  signIn: (auth: AuthResponse) => void;
  /** Clears the in-memory session (call after the logout request). */
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("booting");

  useEffect(() => {
    let cancelled = false;
    // The refresh call is single-flight, so React StrictMode's double mount is safe.
    api
      .restoreSession()
      .then((ok) => !cancelled && setStatus(ok ? "authenticated" : "guest"))
      .catch(() => !cancelled && setStatus("guest"));
    const off = api.onSignedOut(() => setStatus("guest"));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const signIn = useCallback((auth: AuthResponse) => {
    api.acceptAuth(auth);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    api.setAccessToken(null);
    setStatus("guest");
  }, []);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
