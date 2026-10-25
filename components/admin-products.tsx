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
  compareAtPrice: string;
  image: string;
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
  image: "",
  category: "millet",
  labels: "",
  inStock: true,
  stock: "",
};

function toForm(product: AdminProduct): FormState {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: String(product.price),
    compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
    image: product.image,
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

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
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
        setError(data?.error || "Upload failed.");
        return;
      }
      setForm((current) => ({ ...current, image: data.url as string }));
    } catch {
      setError("Network error while uploading the image.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const price = Number(form.price);
    const compareAt = form.compareAtPrice ? Number(form.compareAtPrice) : null;
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
    if (!form.image.trim()) {
      setError("Upload an image or paste a path such as /images/photo.jpg.");
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
      image: form.image.trim(),
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
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-mj-brown">
                MRP — struck through (₹, optional)
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={form.compareAtPrice}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    compareAtPrice: event.target.value,
                  }))
                }
                placeholder="Leave empty for no discount"
                className={inputClass}
              />
            </label>

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
                Image
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                {form.image && (
                  <span className="relative block h-16 w-16 overflow-hidden rounded-xl ring-1 ring-mj-beige">
                    <Image
                      src={form.image}
                      alt="Product preview"
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                )}
                <label className="rounded-full border border-mj-beige px-4 py-2 text-sm font-medium text-mj-ink hover:bg-mj-cream">
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    disabled={uploading}
                    onChange={(event) => {
                      void onFilePicked(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <input
                  value={form.image}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      image: event.target.value,
                    }))
                  }
                  placeholder="/images/photo.jpg or an uploaded URL"
                  className="min-w-0 flex-1 rounded-xl border border-mj-beige px-3.5 py-2.5 text-sm text-mj-ink focus:outline-none focus:ring-2 focus:ring-mj-green/30"
                />
              </div>
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
            No products yet. Use “Add product” to create the first one.
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
