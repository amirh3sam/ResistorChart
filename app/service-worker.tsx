"use client";

import { useEffect } from "react";

/** Registers /sw.js so the calculator keeps working offline once installed. */
export default function ServiceWorker() {
  useEffect(() => {
    // The Android app already ships its files inside the APK, so it needs no cache.
    const native = "Capacitor" in window;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && !native) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
