"use client";

import { useEffect } from "react";

const LOG_ENDPOINT = "http://127.0.0.1:7587/ingest/2c649473-d553-40ac-a354-2089a54d94ff";

function debugLog(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24f9f6" },
    body: JSON.stringify({
      sessionId: "24f9f6",
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

export function DebugErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // #region agent log
    const onError = (e: ErrorEvent) => {
      debugLog(
        "DebugErrorHandler:window.onerror",
        "Uncaught error",
        { message: e.message, filename: e.filename, lineno: e.lineno },
        "H3"
      );
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      debugLog(
        "DebugErrorHandler:unhandledrejection",
        "Unhandled promise rejection",
        { reason: String(e.reason) },
        "H3"
      );
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
    // #endregion
  }, []);

  return <>{children}</>;
}
