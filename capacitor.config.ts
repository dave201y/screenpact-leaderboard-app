import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.screenpact.app",
  appName: "ScreenPact",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
