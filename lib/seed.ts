import type { AnnouncementConfig, Product } from "./types";

/** Settings keys. One row each in the `settings` table. */
export const CATALOG_SEEDED_KEY = "catalogSeeded";
export const ANNOUNCEMENTS_KEY = "announcements";

/**
 * The original six products, kept as the starting catalog. Seeded into the
 * store on first load so a fresh install (or a database that has not been
 * migrated yet) still renders a full storefront.
 */
export function seedProducts(): Product[] {
  const now = 1792812054661;
  const base = [
    {
      id: "mj-foxtail",
      name: "Foxtail Millet",
      slug: "foxtail-millet",
      description: "Naturally gluten-free, light and easy to digest.",
      price: 199,
      image: "/images/WhatsApp Image 2026-10-22 at 5.17.24 PM.jpeg",
      category: "millet" as const,
      labels: ["Bestseller"],
    },
    {
      id: "mj-barnyard",
      name: "Barnyard Millet",
      slug: "barnyard-millet",
      description: "Wholesome grain, perfect for upma and pongal.",
      price: 199,
      image: "/images/WhatsApp Image 2026-10-22 at 5.17.24 PM (1).jpeg",
      category: "millet" as const,
      labels: [],
    },
    {
      id: "mj-kodo",
      name: "Kodo Millet",
      slug: "kodo-millet",
      description: "Traditional millet with a nutty flavor.",
      price: 219,
      image: "/images/WhatsApp Image 2026-10-22 at 5.17.24 PM (2).jpeg",
      category: "millet" as const,
      labels: [],
    },
    {
      id: "mj-little",
      name: "Little Millet",
      slug: "little-millet",
      description: "Tiny grains, big on nutrition and versatility.",
      price: 219,
      image: "/images/WhatsApp Image 2026-10-22 at 5.17.25 PM.jpeg",
      category: "millet" as const,
      labels: [],
    },
    {
      id: "mj-mix",
      name: "Millet Mix",
      slug: "millet-mix",
      description: "A balanced blend for everyday cooking.",
      price: 249,
      image: "/images/WhatsApp Image 2026-10-22 at 5.17.25 PM (1).jpeg",
      category: "mix" as const,
      labels: [],
    },
    {
      id: "mj-special",
      name: "Millet Jar Special",
      slug: "millet-jar-special",
      description: "Our signature pack, farm-sourced and carefully cleaned.",
      price: 279,
      image: "/images/WhatsApp Image 2026-10-22 at 5.17.26 PM.jpeg",
      category: "mix" as const,
      labels: ["Signature"],
    },
  ];

  return base.map((product, index) => ({
    ...product,
    compareAtPrice: null,
    inStock: true,
    stock: null,
    createdAt: now + index,
    updatedAt: now + index,
  }));
}

/** Ticker is off until the admin turns it on and adds messages. */
export function defaultAnnouncements(): AnnouncementConfig {
  return { enabled: false, messages: [] };
}
