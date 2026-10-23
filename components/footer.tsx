import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-mj-beige bg-mj-cream/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="group inline-flex items-center gap-3"
              aria-label="Millet Jar home"
            >
              <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-mj-beige transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-105">
                <Image
                  src="/images/logo.png"
                  alt="Millet Jar logo"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <span className="text-lg font-semibold text-mj-ink">
                Millet Jar
              </span>
            </Link>
            <p className="mt-2 max-w-sm text-sm text-mj-brown">
              {SITE.tagline} Naturally sourced millets, cleaned with care and
              packed for everyday cooking.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1 text-mj-green ring-1 ring-mj-beige">
                Farm sourced
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-mj-green ring-1 ring-mj-beige">
                Order on WhatsApp
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-mj-green ring-1 ring-mj-beige">
                Free delivery over ₹499
              </span>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-mj-ink">Shop</div>
            <ul className="mt-3 space-y-2 text-sm text-mj-brown">
              <li>
                <Link href="/products" className="hover:text-mj-green">
                  All products
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-mj-green">
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/booking" className="hover:text-mj-green">
                  Delivery details
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-mj-green">
                  My account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-mj-ink">Connect</div>
            <ul className="mt-3 space-y-2 text-sm text-mj-brown">
              <li>
                <a href={SITE.url} className="hover:text-mj-green">
                  {SITE.domain}
                </a>
              </li>
              <li>
                <a
                  href={`https://www.instagram.com/${SITE.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-mj-green"
                >
                  {SITE.instagram}
                </a>
              </li>
              <li>
                <Link href="/contact" className="hover:text-mj-green">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-mj-beige pt-6 text-xs text-mj-brown sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Millet Jar. All rights reserved.
          </span>
          <span>Fresh from Farm to Your Family.</span>
        </div>
      </div>
    </footer>
  );
}
