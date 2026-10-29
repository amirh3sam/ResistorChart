import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amirhesamtech.resistorcalc",
  appName: "Resistor Calc",
  // Static export from `CAPACITOR_BUILD=1 next build`.
  webDir: "out",
  backgroundColor: "#0b0d12",
  ios: {
    // The page handles the notch itself with env(safe-area-inset-*).
    contentInset: "never",
  },
};

export default config;
