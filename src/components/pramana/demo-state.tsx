import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  ApiError,
  getCurrentUser,
  login as apiLogin,
  type LoginPayload,
  type LoginResult,
} from "@/lib/pramana-api";
import { readSession, writeSession, type Session } from "@/lib/session";

// Shared domain types now live with the API layer (mirroring the backend
// Pydantic schemas); they are re-exported here for existing imports.
export type Role = "customer" | "admin";
export type KycStatus = string;
export type MatchStatus = string;
export type {
  ComparisonField,
  DemoRequest,
  KycRequestSummary,
  AuditEvent,
} from "@/lib/pramana-api";

/**
 * Live session context.
 *
 * This provider no longer holds seeded requests, audit entries, or locally
 * simulated mutations. All server data comes from the FastAPI backend through
 * React Query hooks (`src/hooks/pramana-queries.ts`); only genuine client-side
 * UI state — the current session — lives here.
 */
type SessionContextValue = {
  role: Role | null;
  ready: boolean;
  sessionError: string | null;
  session: Session | null;
  userId: string | null;
  name: string | null;
  email: string | null;
  /** POSTs to /auth/login and stores the session only when the API succeeds. */
  login: (payload: LoginPayload) => Promise<LoginResult>;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Revalidate the stored token with the backend before treating its identity as trusted.
  const [session, setSessionState] = useState<Session | null>(() =>
    typeof window !== "undefined" ? readSession() : null,
  );
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !readSession());
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !ready) {
      let active = true;
      void getCurrentUser()
        .then((user) => {
          if (!active) return;
          setSessionError(null);
          const restored: Session = {
            token: readSession()?.token ?? "",
            role: user.role,
            userId: user.userId,
            name: user.name,
            email: user.email,
          };
          setSessionState(restored);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setSessionState(null);
          setSessionError(
            error instanceof ApiError && error.status === 401
              ? null
              : "Could not verify your existing session. Please sign in again.",
          );
          try {
            writeSession(null);
          } catch {
            // The current process remains signed out even if browser storage is unavailable.
          }
        })
        .finally(() => {
          if (active) setReady(true);
        });
      return () => {
        active = false;
      };
    }
    return undefined;
  }, [ready]);

  const setSession = (next: Session | null) => {
    if (next) {
      writeSession(next);
      setSessionState(next);
      setSessionError(null);
      return;
    }
    setSessionState(null);
    setSessionError(null);
    writeSession(null);
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      role: session?.role ?? null,
      ready,
      sessionError,
      userId: session?.userId ?? null,
      name: session?.name ?? null,
      email: session?.email ?? null,
      login: async (payload: LoginPayload) => {
        const result = await apiLogin(payload);
        const nextRole: Role = result.role === "admin" ? "admin" : "customer";
        setSession({
          token: result.token,
          role: nextRole,
          userId: result.userId,
          name: result.name,
          email: result.email,
        });
        return result;
      },
      logout: () => setSession(null),
    }),
    [session, ready, sessionError],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// Backwards-compatible alias; the demo simulation is gone, but the public
// symbols used by app-ui and tests are preserved.
export const DemoProvider = SessionProvider;

export function useDemo(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useDemo must be used within DemoProvider");
  return value;
}
