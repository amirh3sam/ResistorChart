import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amirhesamtech.resistorcalc",
  appName: "Resistor Calc",
  // Static export from `CAPACITOR_BUILD=1 next build` (npm run android:build).
  webDir: "out",
  backgroundColor: "#0a0e14",
  plugins: {
    SystemBars: {
      // The page already pads itself with env(safe-area-inset-*) and uses
      // viewport-fit=cover, so draw edge to edge from the first frame.
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
