import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hopebridge.financialassistance",
  appName: "EAZREAL",
  webDir: "www",
  server: {
    // Open the complete EAZREAL social platform by default.
    // HOPEBRIDGE assistance remains available inside the platform.
    url: "https://us-hope-bridge.vercel.app/social",
    cleartext: false,
    allowNavigation: ["us-hope-bridge.vercel.app"],
  },
};

export default config;
