import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireExists = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required path: ${relativePath}`);
  }
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const packageJson = JSON.parse(readText("package.json"));
const config = readText("capacitor.config.ts");
const fallback = readText("mobile-shell/index.html");
const service = readText("src/services/mobile/mobileCapacitorShell.ts");
const doc = readText("docs/mobile-capacitor-shell.md");
const report = readText("docs/roadmap/reports/08-03-capacitor-shell-2026-05-29.md");
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const androidManifest = readText("android/app/src/main/AndroidManifest.xml");
const androidStrings = readText("android/app/src/main/res/values/strings.xml");
const androidUnitTest = readText(
  "android/app/src/test/java/com/flowforce/app/ExampleUnitTest.java",
);
const androidInstrumentedTest = readText(
  "android/app/src/androidTest/java/com/flowforce/app/ExampleInstrumentedTest.java",
);

requireExists("ios/App/App.xcodeproj/project.pbxproj");
requireExists("android/settings.gradle");
requireExists("android/app/build.gradle");
requireExists("android/app/src/main/java/com/flowforce/app/MainActivity.java");

for (const dependency of [
  "@capacitor/core",
  "@capacitor/ios",
  "@capacitor/android",
]) {
  if (!packageJson.dependencies?.[dependency]) {
    throw new Error(`Missing Capacitor dependency: ${dependency}`);
  }
}

if (!packageJson.devDependencies?.["@capacitor/cli"]) {
  throw new Error("Missing Capacitor dev dependency: @capacitor/cli");
}

requireIncludes(
  packageJson.scripts ? JSON.stringify(packageJson.scripts) : "",
  [
    "check:mobile-capacitor",
    "mobile:cap:sync",
    "mobile:cap:doctor",
    "mobile:ios:open",
    "mobile:android:open",
  ],
  "package scripts",
);

requireIncludes(
  config,
  [
    "com.flowforce.app",
    "FlowForce",
    "mobile-shell",
    "CAPACITOR_SERVER_URL",
    "allowNavigation",
    "*.flowforce.app",
    "SplashScreen",
  ],
  "Capacitor config",
);

requireIncludes(
  fallback,
  ["FlowForce mobile shell", "CAPACITOR_SERVER_URL", "viewport-fit=cover"],
  "mobile shell fallback",
);

requireIncludes(
  `${androidManifest}\n${androidStrings}\n${androidUnitTest}\n${androidInstrumentedTest}`,
  ["com.flowforce.app", "FlowForce"],
  "Android FlowForce branding",
);

requireIncludes(
  service,
  [
    "mobileCapacitorShell",
    "com.flowforce.app",
    "CAPACITOR_SERVER_URL",
    "ios",
    "android",
    "isMobileCapacitorShellReady",
  ],
  "mobile Capacitor shell service",
);

requireIncludes(
  doc,
  [
    "fresh shell",
    "CAPACITOR_SERVER_URL",
    "iOS project: `ios/App`",
    "Android project: `android`",
    "Remaining Native Blockers",
    "Local Android Java Runtime",
    "Android Studio's bundled JBR",
    "Supabase auth redirect allowlists",
  ],
  "mobile Capacitor shell doc",
);

requireIncludes(
  report,
  [
    "active Capacitor-first mobile shell",
    "fresh FlowForce app ID/name",
    "SSR/API-backed Next.js app",
    "Native projects: `ios/App`, `android`",
    "Android Studio's bundled JBR",
  ],
  "Plan 08 phase report",
);

requireIncludes(
  plan,
  [
    "- [x] Restore/add active Capacitor config.",
    "- [x] Add iOS and Android projects.",
    "- [x] Configure app name, bundle IDs, icons, splash, and allowed origins.",
    "- [x] Verify local build/run.",
    "08.03 Capacitor Shell",
    "mobile-capacitor-shell.md",
  ],
  "Plan 08 roadmap",
);

const phaseThreeBlock = plan.match(
  /### Phase 3: Capacitor Shell[\s\S]*?(?=### Phase 4: Auth And Routing In App Shell)/,
)?.[0];

if (!phaseThreeBlock || phaseThreeBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 3 still has unchecked tasks");
}

const shell = await jiti.import(
  join(root, "src/services/mobile/mobileCapacitorShell.ts"),
);

if (!shell.isMobileCapacitorShellReady()) {
  throw new Error("Mobile Capacitor shell contract is not ready");
}

process.stdout.write("OK mobile Capacitor shell contract\n");
