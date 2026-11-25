import type { ReactNode } from "react";

/** The cart page is a Client Component, so its noindex metadata lives here. */
export const metadata = {
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}
