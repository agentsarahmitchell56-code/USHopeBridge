import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hopebridge.financialassistance",
  appName: "HOPEBRIDGE",
  webDir: "www",
  server: {
    // Initial customer-test APK loads the existing secure HOPEBRIDGE service.
    // This keeps applications, status lookup, chat, and uploads on the existing backend.
    url: "https://us-hope-bridge.vercel.app/apply",
    cleartext: false,
    allowNavigation: ["us-hope-bridge.vercel.app"],
  },
};

export default config;
