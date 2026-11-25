"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Last-resort boundary for errors in the root layout. Own document required. */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[milletjar] global error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F8F6F1",
          color: "#2B2A27",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <title>Something went wrong | Millet Jar</title>
        <main
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: 32,
            textAlign: "center",
            background: "#FFFFFF",
            border: "1px solid #E7E1D5",
            borderRadius: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6F6B62",
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ margin: "8px 0 12px", fontSize: 24 }}>
            We couldn&rsquo;t load Millet Jar
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#6F6B62" }}>
            Please try again. If the problem continues, contact us on WhatsApp.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={retry}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "#FFFFFF",
                background: "#1F7C3F",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                borderRadius: 999,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                color: "#2B2A27",
                border: "1px solid #E7E1D5",
                textDecoration: "none",
              }}
            >
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
