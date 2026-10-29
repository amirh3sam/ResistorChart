import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { STATE_KEY, THEME_KEY } from "@/lib/storage-keys";
import ServiceWorker from "./service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resistor Color Code Calculator",
  description:
    "Resistor color codes both ways (4, 5 and 6-band), SMD codes, LED resistor and series/parallel calculators. Works offline.",
  applicationName: "Resistor Calc",
  appleWebApp: {
    capable: true,
    title: "Resistor Calc",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
    { media: "(prefers-color-scheme: light)", color: "#f3f4f7" },
  ],
};

// Runs before first paint so the saved (or OS) theme applies without a flash.
// If a previous session was saved, it also hides the calculator until the
// client restores it (see saved-state.ts), so the defaults never flash; the
// timeout is a safety net in case scripts fail to load.
const themeScript = `(function(){try{var d=document.documentElement;if(localStorage.getItem(${JSON.stringify(STATE_KEY)})){d.dataset.restoring="";setTimeout(function(){delete d.dataset.restoring},1500)}var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;var c=t==="light"?"#f3f4f7":"#0b0d12";document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",c)})}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
