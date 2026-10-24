import Link from "next/link";
import { SITE, CONTACT } from "@/lib/config";
import Reveal from "@/components/reveal";

export const metadata = {
  title: "Contact | Millet Jar",
  description: "Get in touch with Millet Jar for orders and support.",
};

export default function ContactPage() {
  const whatsappHref = `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(
    "Hi Millet Jar, I have a question about your products."
  )}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="text-xs text-mj-brown" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-mj-green">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-mj-ink">Contact</span>
      </nav>

      <Reveal className="mt-4">
        <h1 className="text-3xl font-semibold text-mj-ink">
          Talk to us
        </h1>
        <p className="mt-2 max-w-xl text-mj-brown">
          Questions about a product, delivery or your order? WhatsApp is the
          fastest way to reach us.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Reveal>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mj-press block h-full rounded-2xl border border-mj-beige bg-white p-5 hover:shadow-sm"
        >
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            WhatsApp
          </div>
          <div className="mt-1 font-medium text-mj-ink">Message us</div>
          <p className="mt-1 text-sm text-mj-brown">
            Order help and product questions.
          </p>
        </a>
        </Reveal>

        <Reveal delay={60}>
        <a
          href={`mailto:${CONTACT.email}`}
          className="mj-press block h-full rounded-2xl border border-mj-beige bg-white p-5 hover:shadow-sm"
        >
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            Email
          </div>
          <div className="mt-1 font-medium text-mj-ink">{CONTACT.email}</div>
          <p className="mt-1 text-sm text-mj-brown">
            For invoices and business enquiries.
          </p>
        </a>
        </Reveal>

        <Reveal delay={120}>
        <a
          href={SITE.url}
          className="mj-press block h-full rounded-2xl border border-mj-beige bg-white p-5 hover:shadow-sm"
        >
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            Website
          </div>
          <div className="mt-1 font-medium text-mj-ink">{SITE.domain}</div>
          <p className="mt-1 text-sm text-mj-brown">Browse the full range.</p>
        </a>
        </Reveal>

        <Reveal delay={180}>
        <a
          href={`https://www.instagram.com/${SITE.instagram.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mj-press block h-full rounded-2xl border border-mj-beige bg-white p-5 hover:shadow-sm"
        >
          <div className="text-xs uppercase tracking-wide text-mj-brown">
            Instagram
          </div>
          <div className="mt-1 font-medium text-mj-ink">{SITE.instagram}</div>
          <p className="mt-1 text-sm text-mj-brown">
            Recipes and updates from the farm.
          </p>
        </a>
        </Reveal>
      </div>

      <p className="mt-8 text-sm text-mj-brown">
        Already have an order?{" "}
        <Link href="/account" className="text-mj-green hover:underline">
          Check your account
        </Link>{" "}
        for status and payment.
      </p>
    </div>
  );
}
