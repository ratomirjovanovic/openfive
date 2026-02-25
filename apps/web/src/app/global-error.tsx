"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: "#666", marginTop: 8 }}>An unexpected error occurred.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
