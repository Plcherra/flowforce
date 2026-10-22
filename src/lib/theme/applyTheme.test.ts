import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyTheme,
  themeBootScript,
  themeClassList,
  THEME_STORAGE_KEY,
} from "./applyTheme";

function createRoot(initial: string[] = []) {
  const classes = new Set(initial);
  const attributes = new Map<string, string>();
  return {
    classes,
    classList: {
      add(token: string) {
        classes.add(token);
      },
      remove(token: string) {
        classes.delete(token);
      },
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
  };
}

export function runApplyThemeTests() {
  for (const name of ["flowforce", "light", "dark"] as const) {
    const root = createRoot(["dark"]);
    const resolved = applyTheme(name, root);
    assert.equal(resolved, name);
    assert.equal(root.getAttribute("data-theme"), name);
    assert.deepEqual([...root.classes], [...themeClassList(name)]);
  }

  for (const value of ["system", "blue", "", null, undefined]) {
    const root = createRoot(["dark"]);
    const resolved = applyTheme(value, root);
    assert.equal(resolved, "flowforce");
    assert.equal(root.getAttribute("data-theme"), "flowforce");
    assert.deepEqual([...root.classes], []);
  }

  assert.equal(themeBootScript.includes(THEME_STORAGE_KEY), true);
  assert.equal(themeBootScript.includes('data-theme'), true);
  assert.equal(themeBootScript.includes('classList.remove("dark")'), true);
  assert.equal(themeBootScript.includes("prefers-color-scheme"), false);

  const here = path.dirname(fileURLToPath(import.meta.url));
  const footer = fs.readFileSync(
    path.resolve(here, "../../features/marketing/components/LandingFooter.tsx"),
    "utf8",
  );
  assert.equal(footer.includes("Dark mode"), false);
  assert.equal(footer.includes("setDarkMode"), false);

  const layout = fs.readFileSync(
    path.resolve(here, "../../../app/layout.tsx"),
    "utf8",
  );
  assert.equal(layout.includes("themeBootScript"), true);
  assert.equal(layout.includes("prefers-color-scheme"), false);
  assert.equal(layout.includes('themeColor: "#ffffff"'), true);
}
