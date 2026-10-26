"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll entrance wrapper: children fade up slightly as they enter the
 * viewport, then settle in with a subtle scale. Stagger delays are applied
 * to the *in* transition so siblings animate one after another.
 *
 * Reduced-motion users (and browsers with scripting disabled) see content
 * immediately thanks to the CSS fallback in globals.css.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms before the reveal starts. */
  delay?: number;
  /** Element to render — use "li" inside lists to keep valid markup. */
  as?: "div" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stagger = Math.min(5, Math.round(delay / 80));
  const cls = `mj-reveal ${visible ? "is-visible" : ""} ${className}`;
  // Stagger the entrance itself, not the waiting state, so the element is
  // already correctly placed before the animation begins.
  const style: Record<string, string> = { "data-stagger": String(stagger) };

  if (as === "li") {
    return (
      <li ref={setRef} className={cls} style={style}>
        {children}
      </li>
    );
  }
  if (as === "article") {
    return (
      <article ref={setRef} className={cls} style={style}>
        {children}
      </article>
    );
  }
  return <div ref={setRef} className={cls} style={style}>{children}</div>;
}
