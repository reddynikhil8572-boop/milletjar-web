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

  // Two identical passes so the -50% keyframe loops seamlessly.
  const loop = [...messages, ...messages];

  return (
    <div className="mj-ticker" aria-label="Store announcements">
      <div className="mj-ticker__track text-xs font-medium tracking-wide">
        {loop.map((message, index) => {
          const content = (
            <>
              <span aria-hidden="true" className="text-mj-orange">
                ✦
              </span>
              <span>{message.text}</span>
            </>
          );
          const className =
            "flex shrink-0 items-center gap-2 whitespace-nowrap pr-10";
          return message.href ? (
            <a
              key={`${message.id}-${index}`}
              href={message.href}
              className={`${className} hover:underline`}
            >
              {content}
            </a>
          ) : (
            <span key={`${message.id}-${index}`} className={className}>
              {content}
            </span>
          );
        })}
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
