"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images?: string[];
  category: "millet" | "mix" | "snack";
  labels: string[];
  inStock: boolean;
  /** null = quantity not tracked. */
  stock?: number | null;
  createdAt: number;
  updatedAt: number;
};

const CATEGORIES = [
  { value: "millet", label: "Millet" },
  { value: "mix", label: "Mix" },
  { value: "snack", label: "Snack" },
];

type FormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  /** Either an MRP value, or a discount percentage with the % suffix. */
  compareAtPrice: string;
  /** When true, compareAtPrice holds a percentage like "20%". */
  discountMode: boolean;
  images: string[];
  category: "millet" | "mix" | "snack";
  labels: string;
  inStock: boolean;
  /** Empty string = not tracked. */
  stock: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  discountMode: false,
  images: [],
  category: "millet",
  labels: "",
  inStock: true,
  stock: "",
};

function toForm(product: AdminProduct): FormState {
  // Keep the existing MRP when it is set; start in MRP mode.
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: String(product.price),
    compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
    discountMode: false,
    images:
      product.images && product.images.length > 0
        ? product.images.slice(0, 4)
        : [product.image],
    category: product.category,
    labels: product.labels.join(", "),
    inStock: product.inStock,
    stock: product.stock === null || product.stock === undefined ? "" : String(product.stock),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

/**
 * Effective MRP derived from either an explicit value or a discount percentage.
 * When no discount is configured, returns null (no strikethrough).
 */
function effectiveMrp(form: FormState): number | null {
  const priceRaw = form.price.trim();
  if (!priceRaw) return null;
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return null;

  const entered = form.compareAtPrice.trim();
  if (!entered) return null;

  if (form.discountMode) {
    // "20%" -> MRP = price / (1 - 0.20)
    const pctRaw = entered.replace(/%/g, "").trim();
    if (!pctRaw) return null;
    const pct = Number(pctRaw);
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null;
    const mrp = price / (1 - pct / 100);
    return Math.round(mrp);
  }

  const mrp = Number(entered);
  if (!Number.isFinite(mrp) || mrp <= 0) return null;
  return mrp;
}

/** Discount preview, derived from the (possibly partial) form values. */
function discountPreview(form: FormState): {
  active: boolean;
  price: number | null;
  mrp: number | null;
  savings: number;
  percent: number;
} {
  const priceRaw = form.price.trim();
  if (!priceRaw) return { active: false, price: null, mrp: null, savings: 0, percent: 0 };
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return { active: false, price, mrp: null, savings: 0, percent: 0 };

  const mrp = effectiveMrp(form);
  if (mrp === null || mrp <= price) return { active: false, price, mrp, savings: 0, percent: 0 };
  const savings = mrp - price;
  const percent = Math.round((savings / mrp) * 100);
  return { active: true, price, mrp, savings, percent };
}

function computedCompareAtPrice(form: FormState): number | null {
  if (!form.price.trim()) return null;
  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const mrp = effectiveMrp(form);
  if (mrp === null || mrp <= price) return null;
  return mrp;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink placeholder:text-mj-brown/50 focus:outline-none focus:ring-2 focus:ring-mj-green/30";

export default function AdminProducts({ csrf }: { csrf: string }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // "new" | product id
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not load products.");
        return;
      }
      const data = (await res.json()) as { products: AdminProduct[] };
      setProducts(data.products);
      setError("");
    } catch {
      setError("Network error while loading products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data is only set after an await, so mount does not cascade renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditing("new");
    setNotice("");
    setError("");
  }

  function startEdit(product: AdminProduct) {
    setForm(toForm(product));
    setEditing(product.id);
    setNotice("");
    setError("");
  }

  async function onFilesPicked(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    if (form.images.length + selectedFiles.length > 4) {
      setError("A product can have up to 4 photos.");
      return;
    }

    setUploading(true);
    setError("");
    const uploaded: string[] = [];
    try {
      for (const file of selectedFiles) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/products/image", {
          method: "POST",
          credentials: "same-origin",
          headers: { "x-csrf-token": csrf },
          body,
        });
        const data = (await res.json().catch(() => null)) as {
          url?: string;
          error?: string;
        } | null;
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || "Image upload failed.");
        }
        uploaded.push(data.url);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Network error while uploading images."
      );
    } finally {
      if (uploaded.length > 0) {
        setForm((current) => ({
          ...current,
          images: [...current.images, ...uploaded].slice(0, 4),
        }));
      }
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const price = Number(form.price);
    const compareAt = computedCompareAtPrice(form);
    const labels = form.labels
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Give the product a name (at least 2 characters).");
      setSaving(false);
      return;
    }
    if (!Number.isInteger(price) || price < 1) {
      setError("Enter a whole-number price, e.g. 199.");
      setSaving(false);
      return;
    }
    if (compareAt !== null && (!Number.isInteger(compareAt) || compareAt < 1)) {
      setError("MRP must be a whole number, or left empty.");
      setSaving(false);
      return;
    }
    const images = form.images.map((image) => image.trim()).filter(Boolean);
    if (images.length === 0) {
      setError("Add at least one product photo.");
      setSaving(false);
      return;
    }
    const stock = form.stock.trim() === "" ? null : Number(form.stock);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setError("Stock must be a whole number, or left empty to not track it.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim(),
      price,
      compareAtPrice: compareAt,
      image: images[0],
      images,
      category: form.category,
      labels,
      inStock: form.inStock,
      stock,
    };

    try {
      const creating = editing === "new";
      const res = await fetch(
        creating ? "/api/admin/products" : `/api/admin/products/${editing}`,
        {
          method: creating ? "POST" : "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrf,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error || "Could not save the product.");
        return;
      }
      setEditing(null);
      setNotice(creating ? "Product added." : "Product updated.");
      await load();
    } catch {
      setError("Network error while saving the product.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: AdminProduct) {
    if (
      !window.confirm(`Delete "${product.name}"? This cannot be undone.`)
    ) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "x-csrf-token": csrf },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not delete the product.");
        return;
      }
      setNotice("Product deleted.");
      if (editing === product.id) setEditing(null);
      await load();
    } catch {
      setError("Network error while deleting the product.");
    }
  }

  const preview = discountPreview(form);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-mj-ink">Products</h2>
          <p className="text-sm text-mj-brown">
            {products.length} in the catalog. Changes appear on the storefront
            right away.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-mj-green px-4 py-2 text-sm font-medium text-white hover:bg-mj-green-700"
        >
          Add product
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

      {products.length > 0 && (
        <div className="mt-5 rounded-2xl border border-mj-beige bg-mj-cream/40 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
            Catalog discount summary
          </span>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs text-mj-brown">
            {products
              .filter((p) => p.compareAtPrice !== null && p.compareAtPrice > p.price)
              .map((p) => {
                const pct = Math.round(
                  ((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100
                );
                return (
                  <li
                    key={p.id}
                    className="rounded-full bg-white px-3 py-1 ring-1 ring-mj-beige"
                  >
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="hover:text-mj-green"
                    >
                      {p.name} — {pct}% off
                    </button>
                  </li>
                );
              })}
            {products.filter((p) => p.compareAtPrice !== null && p.compareAtPrice > p.price).length ===
              0 && (
              <li className="text-mj-brown/60">No discounted products yet.</li>
            )}
          </ul>
        </div>
      )}

      {editing !== null && (
        <form
          onSubmit={submit}
          className="mt-5 rounded-2xl border border-mj-beige bg-white p-5"
        >
          <h3 className="text-base font-semibold text-mj-ink">
            {editing === "new" ? "Add product" : "Edit product"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Name
              </span>
              <input
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug:
                      !current.slug || current.slug === slugify(current.name)
                        ? slugify(name)
                        : current.slug,
                  }));
                }}
                maxLength={120}
                required
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Slug (URL text)
              </span>
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value.toLowerCase(),
                  }))
                }
                maxLength={140}
                placeholder="foxtail-millet"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Category
              </span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as FormState["category"],
                  }))
                }
                className={inputClass}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Price (₹)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                required
                className={inputClass}
              />
            </label>              <div className="flex gap-2">
              <div className="flex-1">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                    {form.discountMode ? "Discount %" : "MRP (₹)"}
                  </span>
                  {form.price && effectiveMrp(form) && (
                    <span className={`ml-1 text-[11px] font-medium ${form.discountMode ? "text-mj-green" : effectiveMrp(form)! > Number(form.price) ? "text-mj-orange" : "text-mj-brown"}`}>
                      {form.discountMode
                        ? `≈ ₹${effectiveMrp(form)} MRP`
                        : `(${Math.round((1 - Number(form.price) / effectiveMrp(form)!) * 100)}% off)`}
                    </span>
                  )}
                  <input
                    type={form.discountMode ? "text" : "number"}
                    inputMode={form.discountMode ? "text" : "numeric"}
                    min={form.discountMode ? undefined : 1}
                    step={form.discountMode ? undefined : 1}
                    value={form.compareAtPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        compareAtPrice: event.target.value,
                      }))
                    }
                    placeholder={form.discountMode ? "e.g. 20%" : "Leave empty for no discount"}
                    className={inputClass}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((current) => {
                    const nextMode = !current.discountMode;
                    // When switching to % mode and there is already an MRP,
                    // seed the percentage from the existing discount.
                    const nextCompareAtPrice:
                      | string
                      | number = nextMode
                        ? current.compareAtPrice && current.price && Number(current.price) > 0 &&
                          Number(current.compareAtPrice) > Number(current.price)
                          ? String(
                              Math.round(
                                ((Number(current.compareAtPrice) - Number(current.price)) /
                                  Number(current.compareAtPrice)) *
                                  100
                              )
                            ) + "%"
                          : current.compareAtPrice
                        : current.compareAtPrice;
                    return {
                      ...current,
                      discountMode: nextMode,
                      compareAtPrice: nextCompareAtPrice,
                    };
                  });
                }}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium hover:bg-mj-cream {
                  form.discountMode
                    ? "border-mj-green/40 bg-mj-green/5 text-mj-green"
                    : "border-mj-beige text-mj-ink"
                }`}
                title={form.discountMode ? "Switch to MRP input" : "Switch to discount % input"}
              >
                {form.discountMode ? "MRP" : "%"}
              </button>
            </div>

            <div className="sm:col-span-2">
              {preview.active ? (
                <div className="mt-1.5 rounded-xl border border-mj-beige bg-mj-cream/60 p-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                    Live discount preview
                  </span>
                  <div className="mt-2 flex flex-wrap items-baseline gap-3">
                    <span className="text-2xl font-semibold text-mj-green">
                      ₹{preview.price}
                    </span>
                    <span className="text-base text-mj-brown line-through">
                      ₹{preview.mrp}
                    </span>
                    <span className="rounded-full bg-mj-orange/15 px-2.5 py-1 text-xs font-semibold text-mj-orange">
                      You save ₹{preview.savings}
                    </span>
                    <span className="rounded-full bg-mj-orange px-2.5 py-1 text-xs font-semibold text-white">
                      {preview.percent}% off
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-mj-brown">
                    On the storefront this product will show the MRP struck
                    through with the selling price on top and a &quot;You save&quot; pill.
                  </p>
                </div>
              ) : form.price || form.compareAtPrice ? (
                <p className="mt-1.5 text-xs text-mj-brown">
                  {!form.price
                    ? "Enter a selling price to see the preview."
                    : !form.compareAtPrice
                      ? form.discountMode
                        ? "Enter a discount percentage to see the preview."
                        : "Enter an MRP above the selling price to show a discount."
                      : form.discountMode
                        ? "Discount must be greater than 0% and less than 100%."
                        : "MRP must be higher than the selling price to show a discount."}
                </p>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Remaining stock (optional)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.stock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stock: event.target.value,
                  }))
                }
                placeholder="Empty = not tracked"
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                maxLength={500}
                rows={3}
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Labels (comma separated — e.g. New, Bestseller)
              </span>
              <input
                value={form.labels}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    labels: event.target.value,
                  }))
                }
                maxLength={200}
                placeholder="New, Diwali Offer"
                className={inputClass}
              />
            </label>

            <div className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                Product photos ({form.images.length}/4)
              </span>
              <div className="mt-1.5 flex flex-wrap gap-3">
                {form.images.map((image, index) => (
                  <span
                    key={`${image}-${index}`}
                    className="relative block h-20 w-20 overflow-hidden rounded-xl ring-1 ring-mj-beige"
                  >
                    <Image
                      src={image}
                      alt={`Product photo ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                      {index === 0 ? "Main photo" : `Photo ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          images: current.images.filter(
                            (_, imageIndex) => imageIndex !== index
                          ),
                        }))
                      }
                      aria-label={`Remove product photo ${index + 1}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-sm text-mj-ink shadow hover:bg-red-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <label className="rounded-full border border-mj-beige px-4 py-2 text-sm font-medium text-mj-ink hover:bg-mj-cream">
                  {uploading
                    ? "Uploading…"
                    : form.images.length >= 4
                      ? "Photo limit reached"
                      : "Upload photos"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    multiple
                    disabled={uploading || form.images.length >= 4}
                    onChange={(event) => {
                      void onFilesPicked(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              <input
                value={form.images[0] ?? ""}
                onChange={(event) => {
                  const image = event.target.value;
                  setForm((current) => ({
                    ...current,
                    images: image
                      ? [image, ...current.images.slice(1)]
                      : current.images.slice(1),
                  }));
                }}
                aria-label="Main product photo URL"
                placeholder="Main photo path or uploaded URL"
                className="mt-3 w-full rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
              />
              <p className="mt-1 text-xs text-mj-brown">
                Upload up to 4 photos. The first photo is used on product cards.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-mj-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={form.inStock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    inStock: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-mj-beige accent-mj-green"
              />
              In stock (shown as buyable on the storefront)
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-full bg-mj-green px-5 py-2.5 text-sm font-medium text-white hover:bg-mj-green-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-mj-beige px-5 py-2.5 text-sm font-medium text-mj-ink hover:bg-mj-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-mj-beige bg-white">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-mj-cream" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-sm text-mj-brown">
            No products yet. Use &quot;Add product&quot; to create the first one.
          </p>
        ) : (
          <ul className="divide-y divide-mj-beige">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-4 p-4"
              >
                <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-mj-beige">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-mj-ink">
                      {product.name}
                    </span>
                    {!product.inStock && (
                      <span className="rounded-full bg-mj-ink/80 px-2 py-0.5 text-[11px] text-white">
                        Out of stock
                      </span>
                    )}
                    {product.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-mj-cream px-2 py-0.5 text-[11px] font-semibold text-mj-green"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-mj-brown">
                    <span>/{product.slug}</span>
                    <span>·</span>
                    <span className="capitalize">{product.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-mj-ink">
                    ₹{product.price}
                  </div>
                  {product.compareAtPrice !== null &&
                    product.compareAtPrice > product.price && (
                      <div className="text-xs text-mj-brown line-through">
                        ₹{product.compareAtPrice}
                      </div>
                    )}
                  <div
                    className={`text-[11px] ${
                      product.stock !== null &&
                      product.stock !== undefined &&
                      product.stock <= 5
                        ? product.stock === 0
                          ? "font-semibold text-red-600"
                          : "font-semibold text-amber-600"
                        : "text-mj-brown"
                    }`}
                  >
                    {product.stock === null || product.stock === undefined
                      ? "stock not tracked"
                      : product.stock === 0
                        ? "sold out"
                        : `${product.stock} left`}
                  </div>
                </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(product)}
                      className="rounded-full border border-mj-beige px-3.5 py-1.5 text-xs font-medium text-mj-ink hover:bg-mj-cream"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(product)}
                      className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
