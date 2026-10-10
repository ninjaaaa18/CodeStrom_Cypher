import { useState, type FormEvent } from "react";

import { useAuth } from "../services/auth";

// A small, self-contained authentication panel for the dashboard.
//
// It only renders when Supabase is configured, so the existing dashboard is
// completely unchanged for deployments without Supabase credentials. This panel
// is UX only: it never acts as a security boundary. Authorization for any
// Supabase-only admin action stays enforced server-side via the backend's
// authenticated /api/v1 routes and trusted role checks.
export default function AuthPanel() {
  const { configured, loading, session, role, error, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Render nothing until Supabase is configured and the session restore has
  // settled, so we never flash a sign-in prompt for an already-signed-in user
  // and never alter the dashboard when authentication is unavailable.
  if (!configured || loading) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      await signIn(email.trim(), password);
      setPassword("");
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error ? submitError.message : "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    setLocalError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setLocalError(
        signOutError instanceof Error ? signOutError.message : "Unable to sign out. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const message = localError ?? error;

  if (session) {
    return (
      <div className="auth-panel" aria-live="polite">
        <div className="auth-panel-status">
          <span className="auth-panel-label">Signed in</span>
          <span className="auth-panel-role">{role ?? "verifying role…"}</span>
        </div>
        <button
          type="button"
          className="auth-panel-button"
          onClick={handleSignOut}
          disabled={submitting}
        >
          {submitting ? "Signing out…" : "Sign out"}
        </button>
        {message && <span className="auth-panel-error">{message}</span>}
      </div>
    );
  }

  return (
    <form className="auth-panel auth-panel-signed-out" onSubmit={handleSubmit}>
      <div className="auth-panel-fields">
        <input
          type="email"
          className="auth-panel-input"
          aria-label="Email address"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          className="auth-panel-input"
          aria-label="Password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <button type="submit" className="auth-panel-button" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      {message && <span className="auth-panel-error">{message}</span>}
    </form>
  );
}
