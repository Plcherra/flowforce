export const mobileCapacitorShell = {
  appId: "com.flowforce.app",
  appName: "FlowForce",
  webDir: "mobile-shell",
  serverUrlEnv: "CAPACITOR_SERVER_URL",
  platforms: ["ios", "android"] as const,
  allowedOrigins: [
    "localhost",
    "127.0.0.1",
    "*.flowforce.app",
    "flowforce.app",
  ],
  scripts: [
    "mobile:cap:sync",
    "mobile:cap:doctor",
    "mobile:ios:open",
    "mobile:android:open",
  ],
  localVerification: [
    "npx cap sync",
    "npx cap doctor",
    "xcodebuild -list -project ios/App/App.xcodeproj",
    "cd android && ./gradlew tasks",
  ],
  localJavaRuntime: {
    source: "Android Studio bundled JBR",
    javaHome: "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    configuredIn: "~/.zshrc",
  },
  documentedBlockers: [
    "CAPACITOR_SERVER_URL must point at a reachable Next.js app for real product runtime.",
    "Apple signing and provisioning are still outside the repository.",
    "Android signing keys are still outside the repository.",
    "Store icons and splash assets need final branded artwork.",
  ],
} as const;

export function isMobileCapacitorShellReady() {
  return (
    mobileCapacitorShell.appId === "com.flowforce.app" &&
    mobileCapacitorShell.appName === "FlowForce" &&
    mobileCapacitorShell.webDir === "mobile-shell" &&
    mobileCapacitorShell.platforms.includes("ios") &&
    mobileCapacitorShell.platforms.includes("android") &&
    mobileCapacitorShell.allowedOrigins.includes("localhost") &&
    mobileCapacitorShell.serverUrlEnv === "CAPACITOR_SERVER_URL"
  );
}
