"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Lightweight page-level transition wrapper.
 *
 * On route changes it briefly fades the page content out and back in with a
 * tiny vertical nudge. It is intentionally subtle so the storefront still
 * feels fast, and it defers entirely to CSS for reduced-motion users.
 */
export function MjMotion({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let done = false;
    requestAnimationFrame(() => {
      if (done) return;
      done = true;
      setOut(true);
      requestAnimationFrame(() => {
        if (done) return;
        done = true;
        setOut(false);
      });
    });
  }, [pathname]);

  const cls = out
    ? "mj-page-out"
    : "mj-page-in";


  return (
    <div className={cls}>
      {children}
    </div>
  );
}

