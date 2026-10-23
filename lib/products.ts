export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image: string; // path relative to public
  category: "millet" | "mix" | "snack";
  inStock: boolean;
};

export const products: Product[] = [
  {
    id: "mj-foxtail",
    name: "Foxtail Millet",
    slug: "foxtail-millet",
    description: "Naturally gluten-free, light and easy to digest.",
    price: 199,
    image: "/images/WhatsApp Image 2026-10-22 at 5.17.24 PM.jpeg",
    category: "millet",
    inStock: true,
  },
  {
    id: "mj-barnyard",
    name: "Barnyard Millet",
    slug: "barnyard-millet",
    description: "Wholesome grain, perfect for upma and pongal.",
    price: 199,
    image: "/images/WhatsApp Image 2026-10-22 at 5.17.24 PM (1).jpeg",
    category: "millet",
    inStock: true,
  },
  {
    id: "mj-kodo",
    name: "Kodo Millet",
    slug: "kodo-millet",
    description: "Traditional millet with a nutty flavor.",
    price: 219,
    image: "/images/WhatsApp Image 2026-10-22 at 5.17.24 PM (2).jpeg",
    category: "millet",
    inStock: true,
  },
  {
    id: "mj-little",
    name: "Little Millet",
    slug: "little-millet",
    description: "Tiny grains, big on nutrition and versatility.",
    price: 219,
    image: "/images/WhatsApp Image 2026-10-22 at 5.17.25 PM.jpeg",
    category: "millet",
    inStock: true,
  },
  {
    id: "mj-mix",
    name: "Millet Mix",
    slug: "millet-mix",
    description: "A balanced blend for everyday cooking.",
    price: 249,
    image: "/images/WhatsApp Image 2026-10-22 at 5.17.25 PM (1).jpeg",
    category: "mix",
    inStock: true,
  },
  {
    id: "mj-special",
    name: "Millet Jar Special",
    slug: "millet-jar-special",
    description: "Our signature pack, farm-sourced and carefully cleaned.",
    price: 279,
    image: "/images/WhatsApp Image 2026-10-22 at 5.17.26 PM.jpeg",
    category: "mix",
    inStock: true,
  },
];
