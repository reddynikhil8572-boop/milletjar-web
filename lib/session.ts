import { cache } from "react";
import { cookies } from "next/headers";
import { randomToken, sha256 } from "./crypto";
import { prune, readDB, writeDB } from "./store";
import { env } from "./env";
import type { User, UserSession } from "./types";

export const USER_COOKIE = "mj_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RENEW_AFTER_MS = TTL_MS / 2;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function createUserSession(userId: string): Promise<string> {
  const token = randomToken(32);
  const now = Date.now();
  const session: UserSession = {
    id: sha256(token),
    userId,
    csrf: randomToken(24),
    createdAt: now,
    expiresAt: now + TTL_MS,
    lastSeenAt: now,
  };
  await writeDB((db) => {
    prune(db);
    // One active session per device token; keep a small cap per user.
    db.sessions.push(session);
    const mine = db.sessions.filter((s) => s.userId === userId);
    if (mine.length > 5) {
      const drop = mine
        .sort((a, b) => a.lastSeenAt - b.lastSeenAt)
        .slice(0, mine.length - 5)
        .map((s) => s.id);
      db.sessions = db.sessions.filter((s) => !drop.includes(s.id));
    }
  });
  const store = await cookies();
  store.set(USER_COOKIE, token, cookieOptions());
  return session.csrf;
}

export type AuthContext = {
  user: User;
  session: UserSession;
};

async function resolve(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (!token) return null;
  const id = sha256(token);
  return readDB((db) => {
    const session = db.sessions.find((s) => s.id === id);
    if (!session || session.expiresAt <= Date.now()) return null;
    const user = db.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { user, session };
  });
}

/** Cached per request so multiple server components share one lookup. */
export const getAuth = cache(resolve);

export async function requireUser(): Promise<AuthContext | null> {
  const auth = await getAuth();
  if (!auth) return null;
  // Sliding renewal, persisted at most once per half TTL.
  if (Date.now() - auth.session.lastSeenAt > 60_000) {
    const renew = auth.session.expiresAt - Date.now() < RENEW_AFTER_MS;
    await writeDB((db) => {
      const session = db.sessions.find((s) => s.id === auth.session.id);
      if (!session) return;
      session.lastSeenAt = Date.now();
      if (renew) session.expiresAt = Date.now() + TTL_MS;
    });
  }
  return auth;
}

export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (token) {
    const id = sha256(token);
    await writeDB((db) => {
      db.sessions = db.sessions.filter((s) => s.id !== id);
    });
  }
  store.delete(USER_COOKIE);
}

export async function upsertGoogleUser(input: {
  email: string;
  name: string;
  picture?: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  return writeDB((db) => {
    const now = Date.now();
    let user = db.users.find((u) => u.email === email);
    if (user) {
      user.name = input.name || user.name;
      user.picture = input.picture || user.picture;
      user.lastLoginAt = now;
      return user;
    }
    user = {
      id: `usr_${randomToken(12)}`,
      email,
      name: input.name || email.split("@")[0],
      picture: input.picture,
      provider: "google",
      role: "customer",
      createdAt: now,
      lastLoginAt: now,
    };
    db.users.push(user);
    return user;
  });
}
