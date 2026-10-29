import type { NextConfig } from "next";

// `npm run ios:build` sets CAPACITOR_BUILD to emit a fully static site into
// out/, which Capacitor bundles into the iOS app. Static export can't use
// partial prerendering, so those flags are off for that build only; the
// page is fully static either way. Vercel builds are unchanged.
const nativeBuild = Boolean(process.env.CAPACITOR_BUILD);

const nextConfig: NextConfig = {
  ...(nativeBuild ? { output: "export" as const } : {}),
  cacheComponents: !nativeBuild,
  partialPrefetching: !nativeBuild,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
