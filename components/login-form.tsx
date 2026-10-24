"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  access_denied: "Sign-in was cancelled.",
  oauth_invalid: "That sign-in link was incomplete. Please try again.",
  oauth_state_mismatch:
    "This sign-in attempt could not be verified. Please start again.",
  oauth_expired: "The sign-in attempt expired. Please try again.",
  oauth_exchange: "Google could not confirm the sign-in. Please try again.",
  oauth_profile: "We could not read your Google profile. Please try again.",
  email_unverified:
    "Please verify the email address on your Google account first.",
};

export default function LoginForm({
  googleEnabled,
  devLoginEnabled,
  next,
  initialError,
}: {
  googleEnabled: boolean;
  devLoginEnabled: boolean;
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialError ? ERROR_MESSAGES[initialError] || "Sign-in failed." : ""
  );
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pwName, setPwName] = useState("");
  const [pwEmail, setPwEmail] = useState("");
  const [pwPassword, setPwPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function devSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not sign in.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function passwordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPwBusy(true);
    setError("");
    try {
      const res = await fetch(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "signup"
              ? {
                  email: pwEmail,
                  password: pwPassword,
                  name: pwName.trim() || undefined,
                }
              : { email: pwEmail, password: pwPassword }
          ),
          credentials: "same-origin",
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not continue.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-mj-beige bg-white p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-mj-beige">
            <Image
              src="/images/logo.png"
              alt="Millet Jar logo"
              fill
              sizes="44px"
              className="object-cover"
            />
          </span>
          <span className="text-sm font-medium text-mj-brown">
            www.milletjar.in
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-mj-ink">
          Sign in to Millet Jar
        </h1>
        <p className="mt-1.5 text-sm text-mj-brown">
          One account for your cart, delivery details and order history.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {googleEnabled ? (
          <a
            href={`/api/auth/google/start${
              next && next !== "/account"
                ? `?next=${encodeURIComponent(next)}`
                : ""
            }`}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-mj-beige bg-white px-5 py-3 text-sm font-medium text-mj-ink transition-colors hover:bg-mj-cream"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6c1.9-5.6 7.1-9.7 13.6-9.7Z"
              />
              <path
                fill="#4285F4"
                d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.5c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4Z"
              />
              <path
                fill="#FBBC05"
                d="M10.4 28.8A14.6 14.6 0 0 1 9.6 24c0-1.7.3-3.3.8-4.8l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2 1.4-4.7 2.4-7.8 2.4-6.5 0-11.7-4.1-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48Z"
              />
            </svg>
            Continue with Google
          </a>
        ) : (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Google sign-in needs <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code>. Add them to{" "}
            <code>.env.local</code> and restart the server.
          </div>
        )}

        <div className="mt-5 border-t border-mj-beige pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className={`mj-press rounded-full px-4 py-1.5 text-sm font-medium ${
                mode === "signin"
                  ? "bg-mj-cream text-mj-green"
                  : "text-mj-brown hover:bg-mj-cream/60"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`mj-press rounded-full px-4 py-1.5 text-sm font-medium ${
                mode === "signup"
                  ? "bg-mj-cream text-mj-green"
                  : "text-mj-brown hover:bg-mj-cream/60"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={passwordSubmit} className="mt-4 space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                  Name
                </span>
                <input
                  value={pwName}
                  onChange={(event) => setPwName(event.target.value)}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your name"
                  className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Email
              </span>
              <input
                type="email"
                required
                value={pwEmail}
                onChange={(event) => setPwEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Password
              </span>
              <input
                type="password"
                required
                minLength={mode === "signup" ? 8 : 1}
                value={pwPassword}
                onChange={(event) => setPwPassword(event.target.value)}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "signup" ? "At least 8 characters" : "Your password"
                }
                className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30"
              />
            </label>
            <button
              type="submit"
              disabled={pwBusy}
              className="mj-press w-full rounded-full bg-mj-green px-5 py-3 text-sm font-medium text-white hover:bg-mj-green-700 disabled:opacity-60"
            >
              {pwBusy
                ? mode === "signup"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-3 text-xs leading-relaxed text-mj-brown">
            {mode === "signup"
              ? "Already have an account? "
              : "New to Millet Jar? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
              }}
              className="font-medium text-mj-green hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>

        {devLoginEnabled && (
          <form onSubmit={devSignIn} className="mt-6 border-t border-mj-beige pt-6">
            <label
              htmlFor="dev-email"
              className="text-xs font-medium uppercase tracking-wide text-mj-brown"
            >
              Development sign-in
            </label>
            <input
              id="dev-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-full bg-mj-green px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-mj-green-700 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in for testing"}
            </button>
            <p className="mt-2 text-xs text-mj-brown">
              Only available on this local build. Disabled automatically in
              production.
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-mj-brown">
          We only store your name, email and order history. No passwords are
          kept when you sign in with Google.
        </p>
      </div>
    </div>
  );
}
