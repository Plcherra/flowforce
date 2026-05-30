import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const isCleartextServer =
  typeof serverUrl === "string" && serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.flowforce.app",
  appName: "FlowForce",
  webDir: "mobile-shell",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: isCleartextServer,
        allowNavigation: [
          "localhost",
          "127.0.0.1",
          "*.flowforce.app",
          "flowforce.app",
        ],
      }
    : undefined,
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
  },
};

export default config;
