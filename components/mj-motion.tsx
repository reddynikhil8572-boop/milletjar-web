"use client";

import { usePathname } from "next/navigation";

/**
 * Lightweight page-level entrance wrapper.
 *
 * Keying the wrapper by pathname replays the subtle fade-in on every
 * client-side route change. There is deliberately no fade-out phase: the
 * outgoing animation used to start after the new page had already rendered
 * and, if it got stuck, left the new page at `opacity: 0` (a blank product
 * page). Reduced-motion users get no animation via globals.css.
 */
export function MjMotion({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="mj-page-in">
      {children}
    </div>
  );
}
