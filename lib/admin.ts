import { cookies } from "next/headers";
import { randomToken, sha256 } from "./crypto";
import { prune, readDB, writeDB } from "./store";
import { env } from "./env";

/**
 * Admin authentication is intentionally isolated from customer auth:
 *  - separate endpoint        (/api/admin/auth/*)
 *  - separate cookie name     (mj_admin_session)
 *  - separate session table   (db.adminSessions)
 *  - separate signing secret  (ADMIN_AUTH_SECRET)
 *  - separate CSRF token
 *  - short 2h TTL instead of 7 days
 */
export const ADMIN_COOKIE = "mj_admin_session";
const TTL_MS = 2 * 60 * 60 * 1000;

export type AdminContext = {
  email: string;
  csrf: string;
  expiresAt: number;
};

export async function createAdminSession(email: string): Promise<string> {
  const token = randomToken(32);
  const now = Date.now();
  const csrf = randomToken(24);
  await writeDB((db) => {
    prune(db);
    const existing = db.adminSessions.find((s) => s.email === email);
    if (existing) {
      db.adminSessions = db.adminSessions.filter((s) => s.email !== email);
    }
    db.adminSessions.push({
      id: sha256(token),
      email,
      csrf,
      createdAt: now,
      expiresAt: now + TTL_MS,
      lastSeenAt: now,
    });
    db.audit.push({
      id: `aud_${randomToken(8)}`,
      actor: "admin",
      actorId: email,
      action: "admin.login",
      createdAt: now,
    });
  });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "strict",
    path: "/",
  });
  return csrf;
}

export async function getAdmin(): Promise<AdminContext | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const id = sha256(token);
  return readDB((db) => {
    const session = db.adminSessions.find((s) => s.id === id);
    if (!session || session.expiresAt <= Date.now()) return null;
    return {
      email: session.email,
      csrf: session.csrf,
      expiresAt: session.expiresAt,
    };
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    const id = sha256(token);
    await writeDB((db) => {
      db.adminSessions = db.adminSessions.filter((s) => s.id !== id);
    });
  }
  store.delete(ADMIN_COOKIE);
}
