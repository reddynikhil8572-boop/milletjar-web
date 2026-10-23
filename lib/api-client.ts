"use client";

export type SessionInfo = {
  user: {
    id: string;
    email: string;
    name: string;
    picture: string | null;
    createdAt: number;
  } | null;
  csrfToken: string | null;
  googleEnabled: boolean;
};

export async function getSession(): Promise<SessionInfo> {
  const res = await fetch("/api/auth/me", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    return { user: null, csrfToken: null, googleEnabled: false };
  }
  return (await res.json()) as SessionInfo;
}

export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

/**
 * Every mutation goes through here so the CSRF header always matches the
 * server-side session token. Never call a mutating endpoint directly.
 */
export async function mutate<T = unknown>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST"
): Promise<MutationResult<T>> {
  const session = await getSession();
  if (!session.user || !session.csrfToken) {
    return { ok: false, error: "Please sign in to continue", status: 401 };
  }

  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": session.csrfToken,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ||
      "Request failed. Please try again.";
    return { ok: false, error: message, status: res.status };
  }
  return { ok: true, data: data as T };
}
