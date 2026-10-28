"use client";

import { useEffect } from "react";

/** Registers /sw.js so the calculator keeps working offline once installed. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
