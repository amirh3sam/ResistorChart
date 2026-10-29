"use client";

import { useEffect } from "react";

/** Registers /sw.js so the calculator keeps working offline once installed. */
export default function ServiceWorker() {
  useEffect(() => {
    // The iOS app already ships its files inside the app bundle, and WKWebView
    // doesn't run service workers on Capacitor's custom scheme anyway.
    const native = "Capacitor" in window;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && !native) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
