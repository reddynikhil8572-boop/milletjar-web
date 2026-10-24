"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-provider";
import { SITE } from "@/lib/config";
import { getSession, type SessionInfo } from "@/lib/api-client";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const cart = useCart();
  const pathname = usePathname();
  // The mobile menu is "open" only for the pathname it was opened on, so any
  // navigation (including back/forward) closes it without needing an effect.
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
  const open = menuOpenAt === pathname;

  useEffect(() => {
    let alive = true;
    getSession().then((next) => {
      if (alive) setSession(next);
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-mj-beige/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Millet Jar home"
          >
            <span className="mj-logo-tile relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-mj-beige">
              <Image
                src="/images/logo.png"
                alt="Millet Jar logo"
                fill
                preload
                sizes="40px"
                className="object-cover"
              />
              <span aria-hidden="true" className="mj-logo-shine" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold text-mj-ink">
                Millet Jar
              </span>
              <span className="hidden text-[11px] text-mj-brown sm:block">
                {SITE.tagline}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-mj-cream font-medium text-mj-green"
                      : "text-mj-ink hover:bg-mj-cream/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="mj-press relative inline-flex h-11 items-center gap-2 rounded-full border border-mj-beige px-3 text-sm text-mj-ink hover:bg-mj-cream"
              aria-label={`Cart with ${cart.count} items`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cart.count > 0 && (
                <span
                  key={cart.count}
                  className="mj-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-mj-orange px-1 text-[11px] font-semibold text-white"
                >
                  {cart.count}
                </span>
              )}
            </Link>

            {session?.user ? (
              <Link
                href="/account"
                className="hidden h-10 items-center gap-2 rounded-full bg-mj-green px-4 text-sm font-medium text-white transition-colors hover:bg-mj-green-700 sm:inline-flex"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
                  {session.user.name.charAt(0).toUpperCase()}
                </span>
                Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-full bg-mj-green px-4 text-sm font-medium text-white transition-colors hover:bg-mj-green-700 sm:inline-flex"
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              className="mj-press inline-flex h-11 w-11 items-center justify-center rounded-full text-mj-ink hover:bg-mj-cream md:hidden"
              onClick={() => setMenuOpenAt(open ? null : pathname)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {open ? (
                  <path d="M18 6 6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`mj-mobile-menu bg-white md:hidden${
          open ? " border-t border-mj-beige" : ""
        }`}
        data-open={open}
      >
        <div className="mj-mobile-menu__list mx-auto flex max-w-7xl flex-col px-4 py-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpenAt(null)}
              className="mj-press rounded-lg px-2 py-3 text-mj-ink hover:bg-mj-cream"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={session?.user ? "/account" : "/login"}
            onClick={() => setMenuOpenAt(null)}
            className="mj-press mt-1 rounded-lg bg-mj-green px-2 py-3 text-center font-medium text-white hover:bg-mj-green-700"
          >
            {session?.user ? "My Account" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
