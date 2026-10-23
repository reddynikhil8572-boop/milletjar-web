"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Invalid credentials");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-3xl border border-mj-beige bg-white p-7 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-mj-beige">
          <Image
            src="/images/logo.png"
            alt="Millet Jar logo"
            fill
            sizes="36px"
            className="object-cover"
          />
        </span>
        <div>
          <h1 className="text-base font-semibold text-mj-ink">Admin access</h1>
          <p className="text-[11px] text-mj-brown">Restricted area</p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <label className="mt-6 block">
        <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-ink/20"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
          Password
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-ink/20"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-full bg-mj-ink px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-mj-ink/90 disabled:opacity-60"
      >
        {busy ? "Verifying…" : "Sign in to admin"}
      </button>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-mj-brown">
        Sessions expire after 2 hours. Repeated failures are rate limited.
      </p>
    </form>
  );
}
