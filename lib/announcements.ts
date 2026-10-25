import { readTable, writeDB } from "./store";
import { ANNOUNCEMENTS_KEY, defaultAnnouncements } from "./seed";
import type { AnnouncementConfig } from "./types";

const MAX_MESSAGES = 20;
const MAX_TEXT = 160;
const MAX_HREF = 300;

/**
 * Coerces anything found in storage (or posted by a client) into a valid
 * config. Internal links and https links only, so the ticker can never be
 * used to inject scripts or javascript: URLs.
 */
export function sanitizeAnnouncements(input: unknown): AnnouncementConfig {
  const fallback = defaultAnnouncements();
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Partial<AnnouncementConfig>;
  if (!Array.isArray(raw.messages)) return fallback;

  const messages = raw.messages
    .slice(0, MAX_MESSAGES)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const msg = entry as { id?: unknown; text?: unknown; href?: unknown };
      if (typeof msg.text !== "string") return null;
      const text = msg.text.trim().slice(0, MAX_TEXT);
      if (!text) return null;
      let href: string | undefined;
      if (typeof msg.href === "string") {
        const value = msg.href.trim().slice(0, MAX_HREF);
        if (value.startsWith("/") || value.startsWith("https://")) href = value;
      }
      const id =
        typeof msg.id === "string" && msg.id
          ? msg.id.slice(0, 40)
          : `ann_${Math.random().toString(36).slice(2, 10)}`;
      return { id, text, href };
    })
    .filter((msg): msg is NonNullable<typeof msg> => msg !== null);

  return { enabled: raw.enabled === true, messages };
}

/** The ticker is rendered on the storefront when this comes back enabled. */
export async function getAnnouncements(): Promise<AnnouncementConfig> {
  const settings = await readTable("settings");
  const row = settings.find((entry) => entry.key === ANNOUNCEMENTS_KEY);
  return sanitizeAnnouncements(row?.value);
}

/**
 * Replaces the whole ticker config (admin Promotions tab). When `actorId` is
 * given, the change is recorded in the audit log in the same write.
 */
export async function saveAnnouncements(
  input: unknown,
  actorId?: string
): Promise<AnnouncementConfig> {
  const value = sanitizeAnnouncements(input);
  await writeDB((db) => {
    const row = { key: ANNOUNCEMENTS_KEY, value };
    const index = db.settings.findIndex((entry) => entry.key === ANNOUNCEMENTS_KEY);
    if (index >= 0) db.settings[index] = row;
    else db.settings.push(row);
    if (actorId) {
      db.audit.push({
        id: `aud_${Math.random().toString(36).slice(2, 10)}`,
        actor: "admin",
        actorId,
        action: "announcements.update",
        createdAt: Date.now(),
      });
    }
  });

  // The store tolerates a missing `settings` table; without this check a save
  // would look successful while storing nothing.
  const saved = await readTable("settings");
  const row = saved.find((entry) => entry.key === ANNOUNCEMENTS_KEY);
  if (!row || JSON.stringify(sanitizeAnnouncements(row.value)) !== JSON.stringify(value)) {
    throw new Error("announcements were not persisted");
  }
  return value;
}
