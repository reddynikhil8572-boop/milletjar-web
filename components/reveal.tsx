"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wraps children in a gentle fade + rise as they scroll into view.
 * The observer disconnects after the first reveal, and users who prefer
 * reduced motion (or have scripting disabled) see content immediately.
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
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced-motion users get shown the content via CSS instead, so this
    // only wires the observer; state updates happen inside its callback (or
    // a deferred timeout), never synchronously in the effect body.
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

  const cls = `mj-reveal ${visible ? "is-visible" : ""} ${className}`;
  const style = delay > 0 ? { transitionDelay: `${delay}ms` } : undefined;

  if (as === "li") {
    return (
      <li ref={setRef} className={cls} style={style}>
        {children}
      </li>
    );
  }
  return <div ref={setRef} className={cls} style={style}>{children}</div>;
}
