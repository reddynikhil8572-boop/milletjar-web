export type UserRole = "customer";

export type ProductCategory = "millet" | "mix" | "snack";

/** A catalog entry. Admin-managed: created/edited from /admin. */
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Selling price in INR. This is what the customer pays. */
  price: number;
  /** Original MRP. Shown struck through, with an auto "% off", when higher than price. */
  compareAtPrice: number | null;
  /** Path under /public, or a public Supabase Storage URL. */
  image: string;
  category: ProductCategory;
  /** Short badges on the card, e.g. "New", "Bestseller". */
  labels: string[];
  inStock: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Announcement = { id: string; text: string; href?: string };

/** The scrolling offer ticker shown at the top of the storefront. */
export type AnnouncementConfig = {
  enabled: boolean;
  messages: Announcement[];
};

/** Generic key/value row; `value` is a jsonb column in Supabase. */
export type Setting = { key: string; value: unknown };

export type User = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "dev" | "password";
  /** scrypt hash; only set for email+password accounts. */
  passwordHash?: string;
  role: UserRole;
  createdAt: number;
  lastLoginAt: number;
};

export type UserSession = {
  id: string; // sha256 of the raw token, never the token itself
  userId: string;
  csrf: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
};

export type AdminSession = {
  id: string;
  email: string;
  csrf: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
};

export type OAuthState = {
  state: string;
  verifier: string;
  createdAt: number;
  /** Local path to return to after sign-in. */
  next?: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "whatsapp" | "online" | "cod";
export type PaymentStatus = "unpaid" | "paid" | "failed";

export type Order = {
  id: string;
  reference: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    pincode: string;
    city?: string;
    slot?: string;
  };
  status: OrderStatus;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    providerRef?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export type AuditEvent = {
  id: string;
  actor: "user" | "admin" | "system";
  actorId: string;
  action: string;
  target?: string;
  ip?: string;
  createdAt: number;
};

/** A delivery address the customer has used before, kept for rebooking. */
export type SavedAddress = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  city?: string;
  pincode: string;
  slot?: string;
  createdAt: number;
};

export type DB = {
  users: User[];
  sessions: UserSession[];
  adminSessions: AdminSession[];
  oauthStates: OAuthState[];
  orders: Order[];
  audit: AuditEvent[];
  savedAddresses: SavedAddress[];
  products: Product[];
  settings: Setting[];
};
