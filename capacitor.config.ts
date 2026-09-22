import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.morfah.flowtime",
  appName: "FlowTime",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#ffffff"
    }
  }
};

export default config;
