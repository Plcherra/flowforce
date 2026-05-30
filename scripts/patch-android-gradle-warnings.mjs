import { readFileSync, writeFileSync } from "node:fs";

const replacements = [
  {
    file: "android/capacitor-cordova-android-plugins/build.gradle",
    from: /\n\s*flatDir\s*\{\s*\n\s*dirs 'src\/main\/libs', 'libs'\s*\n\s*\}\s*/g,
    to: "\n",
  },
  {
    file: "android/capacitor-cordova-android-plugins/build.gradle",
    from: /\n\s*implementation fileTree\(dir: 'src\/main\/libs', include: \['\*\.jar'\]\)/g,
    to: "",
  },
];

for (const replacement of replacements) {
  const current = readFileSync(replacement.file, "utf8");
  const next = current.replace(replacement.from, replacement.to);

  if (next !== current) {
    writeFileSync(replacement.file, next);
  }
}
