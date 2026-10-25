"use client";

import { useCallback, useEffect, useState } from "react";

type Message = { id: string; text: string; href?: string };
type Config = { enabled: boolean; messages: Message[] };

const inputClass =
  "w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30";

function newId(): string {
  return `ann_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Editor for the scrolling strip at the very top of the storefront:
 * flip it on, add offer messages, save.
 */
export default function AdminPromotions({ csrf }: { csrf: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not load the promotions.");
        return;
      }
      const data = (await res.json()) as { announcements: Config };
      setConfig(data.announcements);
      setError("");
    } catch {
      setError("Network error while loading the promotions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // State is only set after an await, so mount does not cascade renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function update(patch: Partial<Config>) {
    setConfig((current) =>
      current ? { ...current, ...patch } : current
    );
    setNotice("");
  }

  function updateMessage(id: string, patch: Partial<Message>) {
    setConfig((current) =>
      current
        ? {
            ...current,
            messages: current.messages.map((message) =>
              message.id === id ? { ...message, ...patch } : message
            ),
          }
        : current
    );
    setNotice("");
  }

  function addMessage() {
    setConfig((current) =>
      current && current.messages.length < 20
        ? {
            ...current,
            messages: [...current.messages, { id: newId(), text: "" }],
          }
        : current
    );
    setNotice("");
  }

  function removeMessage(id: string) {
    setConfig((current) =>
      current
        ? {
            ...current,
            messages: current.messages.filter((m) => m.id !== id),
          }
        : current
    );
    setNotice("");
  }

  async function save() {
    if (!config) return;
    const messages = config.messages.filter((message) => message.text.trim());
    if (config.enabled && messages.length === 0) {
      setError("Add at least one message, or turn the ticker off.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({ enabled: config.enabled, messages }),
      });
      const data = (await res.json().catch(() => null)) as {
        announcements?: Config;
        error?: string;
      } | null;
      if (!res.ok || !data?.announcements) {
        setError(data?.error || "Could not save the promotions.");
        return;
      }
      setConfig(data.announcements);
      setNotice("Saved — the storefront ticker is up to date.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-mj-cream" />
        <div className="h-32 animate-pulse rounded-2xl bg-mj-cream" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-mj-ink">
            Scrolling offers bar
          </h2>
          <p className="text-sm text-mj-brown">
            Messages scroll left to right at the top of every storefront page.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => update({ enabled: !config.enabled })}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            config.enabled
              ? "bg-mj-green text-white"
              : "border border-mj-beige text-mj-brown hover:bg-mj-cream"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              config.enabled ? "bg-white" : "bg-mj-brown/50"
            }`}
          />
          {config.enabled ? "Ticker on" : "Ticker off"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="mt-5 space-y-3 rounded-2xl border border-mj-beige bg-white p-5">
        {config.messages.length === 0 && (
          <p className="text-sm text-mj-brown">
            No messages yet. Add one below — for example “Free delivery on
            orders over ₹499”.
          </p>
        )}

        {config.messages.map((message) => (
          <div
            key={message.id}
            className="flex flex-col gap-2 rounded-xl border border-mj-beige p-3 sm:flex-row sm:items-center"
          >
            <input
              value={message.text}
              onChange={(event) =>
                updateMessage(message.id, { text: event.target.value })
              }
              maxLength={160}
              placeholder="New harvest just in — shop now"
              className={inputClass}
            />
            <input
              value={message.href ?? ""}
              onChange={(event) =>
                updateMessage(message.id, { href: event.target.value })
              }
              maxLength={300}
              placeholder="Link (optional) — /products"
              className={`${inputClass} sm:w-56`}
            />
            <button
              type="button"
              onClick={() => removeMessage(message.id)}
              className="shrink-0 rounded-full border border-red-200 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addMessage}
            disabled={config.messages.length >= 20}
            className="rounded-full border border-mj-beige px-4 py-2 text-sm font-medium text-mj-ink hover:bg-mj-cream disabled:opacity-60"
          >
            Add message
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-full bg-mj-green px-5 py-2 text-sm font-medium text-white hover:bg-mj-green-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
