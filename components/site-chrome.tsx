"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import MobileActionBar from "./mobile-action-bar";

function useIsAdminRoute(): boolean {
  const pathname = usePathname();
  return pathname.startsWith("/admin");
}

/** Storefront header, hidden on admin routes. */
export function SiteHeader() {
  if (useIsAdminRoute()) return null;
  return <Header />;
}

/**
 * Scrolling offer strip above the header, hidden on admin routes and when
 * the admin has not enabled any messages.
 */
export function SiteTicker({
  messages,
}: {
  messages: { id: string; text: string; href?: string }[];
}) {
  if (useIsAdminRoute()) return null;
  if (messages.length === 0) return null;

  // Exactly two identical groups: the -50% keyframe then lands on the seam.
  const passes = [0, 1];

  return (
    <div className="mj-ticker" aria-label="Store announcements">
      <span className="mj-ticker__label" aria-hidden="true">
        <span className="mj-ticker__spark">✦</span> Offers
      </span>
      <div className="mj-ticker__viewport">
        <div className="mj-ticker__track text-xs font-medium tracking-wide">
          {passes.map((pass) => (
            <div
              key={pass}
              className="mj-ticker__group"
              aria-hidden={pass === 1 ? true : undefined}
            >
              {messages.map((message) => {
                const content = (
                  <>
                    <span aria-hidden="true" className="mj-ticker__star">
                      ✦
                    </span>
                    <span>{message.text}</span>
                  </>
                );
                const className = "mj-ticker__item";
                return message.href ? (
                  <a
                    key={`${message.id}-${pass}`}
                    href={message.href}
                    tabIndex={pass === 1 ? -1 : undefined}
                    className={`${className} hover:underline`}
                  >
                    {content}
                  </a>
                ) : (
                  <span key={`${message.id}-${pass}`} className={className}>
                    {content}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Storefront footer, hidden on admin routes. */
export function SiteFooter() {
  if (useIsAdminRoute()) return null;
  return <Footer />;
}

/** Mobile quick-action bar, hidden on admin routes. */
export function SiteMobileBar() {
  if (useIsAdminRoute()) return null;
  return <MobileActionBar />;
}
