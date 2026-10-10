import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

const defaultBaseUrl = "http://localhost:4000";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl).replace(/\/$/, "");

export type AppRole = "customer" | "rider" | "admin";

interface SessionInfo {
  user_id: string;
  role: AppRole;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Never log tokens or credentials. This helper reports only safe HTTP status codes.
function describeHttpError(status: number): string {
  switch (status) {
    case 401:
      return "Your session is invalid or has expired. Please sign in again.";
    case 403:
      return "You do not have an authorized profile for this application.";
    default:
      return "Unable to verify your session with the server.";
  }
}

async function fetchServerRole(accessToken: string): Promise<AppRole | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/session`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(describeHttpError(response.status));
  }

  const info = (await response.json()) as SessionInfo;
  if (!info || typeof info.role !== "string") return null;
  return info.role;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);
  const [error, setError] = useState<string | null>(
    configured
      ? null
      : "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in."
  );

  // Guards against out-of-order async responses (e.g. a stale session resolving
  // after a newer one) so role state always reflects the latest session.
  const roleRequestId = useRef(0);
  const mounted = useRef(true);

  const loadRoleForSession = useCallback(async (nextSession: Session | null) => {
    const requestId = (roleRequestId.current += 1);

    if (!nextSession?.access_token) {
      setRole(null);
      return;
    }

    try {
      const verifiedRole = await fetchServerRole(nextSession.access_token);
      // Ignore results from superseded requests.
      if (mounted.current && roleRequestId.current === requestId) {
        setRole(verifiedRole);
      }
    } catch (roleError) {
      if (mounted.current && roleRequestId.current === requestId) {
        setRole(null);
        setError(roleError instanceof Error ? roleError.message : "Unable to verify your role.");
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    if (!configured) {
      // Keep the rest of the dashboard usable when Supabase is not configured.
      setLoading(false);
      return () => {
        mounted.current = false;
      };
    }

    let client;
    try {
      client = getSupabaseClient();
    } catch (configError) {
      setLoading(false);
      setError(
        configError instanceof Error
          ? configError.message
          : "Supabase client could not be initialized."
      );
      return () => {
        mounted.current = false;
      };
    }

    let active = true;

    // Restore any existing persisted session on initialization.
    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
        }
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        setLoading(false);
        void loadRoleForSession(data.session ?? null);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError("Unable to restore your session.");
      });

    // Subscribe to auth changes (sign-in, sign-out, token refresh, expiry).
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setError(null);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void loadRoleForSession(nextSession);
    });

    return () => {
      active = false;
      mounted.current = false;
      subscription.subscription.unsubscribe();
    };
  }, [configured, loadRoleForSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!configured) {
        setError("Supabase is not configured. Sign-in is unavailable.");
        return;
      }

      setError(null);
      try {
        const client = getSupabaseClient();
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        // onAuthStateChange updates session/user; load the server-verified role now.
        const { data } = await client.auth.getSession();
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        await loadRoleForSession(data.session ?? null);
      } catch (signInFailure) {
        setError(signInFailure instanceof Error ? signInFailure.message : "Unable to sign in.");
      }
    },
    [configured, loadRoleForSession]
  );

  const signOut = useCallback(async () => {
    if (!configured) return;

    setError(null);
    try {
      const client = getSupabaseClient();
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        return;
      }
    } catch (signOutFailure) {
      setError(signOutFailure instanceof Error ? signOutFailure.message : "Unable to sign out.");
      return;
    }
    // Clear local state immediately; onAuthStateChange will also fire.
    roleRequestId.current += 1;
    setSession(null);
    setUser(null);
    setRole(null);
  }, [configured]);

  const refreshRole = useCallback(async () => {
    if (!configured) return;
    try {
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      await loadRoleForSession(data.session ?? null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh your role.");
    }
  }, [configured, loadRoleForSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, role, loading, configured, error, signIn, signOut, refreshRole }),
    [session, user, role, loading, configured, error, signIn, signOut, refreshRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}

