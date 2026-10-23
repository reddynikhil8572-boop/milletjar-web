"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SEEN_KEY = "mj_intro_seen_v1";

/**
 * A short, one-per-tab brand splash: the logo springs in, a soft ring pulses
 * and the overlay fades away. Skipped for admin routes, repeat visits in the
 * same tab and users who prefer reduced motion.
 */
export default function BrandIntro() {
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;

    try {
      if (sessionStorage.getItem(SEEN_KEY) === "1") return;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode / storage disabled: still show the intro.
    }

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const start = 40;
    const hold = reduced ? 120 : 900;
    const fade = reduced ? 80 : 480;

    // Deferred so the first paint (and hydration) happen before the overlay
    // appears; also keeps the effect free of synchronous state updates.
    const enterTimer = window.setTimeout(() => setPhase("in"), start);
    const fadeTimer = window.setTimeout(
      () => setPhase("out"),
      start + hold
    );
    const doneTimer = window.setTimeout(
      () => setPhase("idle"),
      start + hold + fade + 60
    );

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "idle") return null;

  return (
    <div
      className={`mj-intro ${phase === "out" ? "mj-intro--out" : ""}`}
      role="presentation"
      aria-hidden="true"
    >
      <div className="mj-intro__inner">
        <div className="relative">
          <span className="mj-intro__ring" />
          <span className="mj-intro__ring mj-intro__ring--late" />
          <span className="mj-intro__tile">
            <Image
              src="/images/logo-160.png"
              alt=""
              width={112}
              height={112}
              className="mj-intro__logo h-28 w-28 object-cover"
            />
            <span className="mj-intro__sheen" />
          </span>
        </div>
        <p className="mj-intro__word">Millet Jar</p>
        <p className="mj-intro__tag">Fresh from Farm to Your Family</p>
        <span className="mj-intro__bar">
          <span className="mj-intro__bar-fill" />
        </span>
      </div>
    </div>
  );
}
