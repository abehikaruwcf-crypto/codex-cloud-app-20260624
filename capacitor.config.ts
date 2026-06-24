import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wcf.charmid",
  appName: "Charm ID",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
  },
};

export default config;
