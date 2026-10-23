"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";

function useIsAdminRoute(): boolean {
  const pathname = usePathname();
  return pathname.startsWith("/admin");
}

/** Storefront header, hidden on admin routes. */
export function SiteHeader() {
  if (useIsAdminRoute()) return null;
  return <Header />;
}

/** Storefront footer, hidden on admin routes. */
export function SiteFooter() {
  if (useIsAdminRoute()) return null;
  return <Footer />;
}
