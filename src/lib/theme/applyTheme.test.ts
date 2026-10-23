import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  applyTheme,
  themeBootScript,
  themeClassList,
  THEME_NAMES,
  THEME_STORAGE_KEY,
  type ThemeName,
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

  assert.deepEqual([...THEME_NAMES], ["flowforce", "light", "dark"]);

  const storedThemes = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return storedThemes.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storedThemes.set(key, value);
    },
  };

  const dataThemes = new Map<ThemeName, string | null>();
  for (const name of THEME_NAMES) {
    storage.setItem(THEME_STORAGE_KEY, name);
    assert.equal(storage.getItem(THEME_STORAGE_KEY), name);
    const root = createRoot(["dark"]);
    const resolved = applyTheme(storage.getItem(THEME_STORAGE_KEY), root);
    assert.equal(resolved, name);
    assert.equal(root.getAttribute("data-theme"), name);
    dataThemes.set(name, root.getAttribute("data-theme"));
    const booted = bootStoredTheme(name);
    assert.equal(booted.dataTheme, name);
    assert.equal(booted.classes.has("dark"), name === "dark");
  }

  assert.notEqual(dataThemes.get("light"), dataThemes.get("flowforce"));
  assert.equal(dataThemes.get("light"), "light");
  assert.equal(dataThemes.get("flowforce"), "flowforce");
  assert.equal(dataThemes.get("dark"), "dark");

  const css = fs.readFileSync(path.resolve(here, "../../../app/globals.css"), "utf8");
  const flowforceBackground = backgroundToken(css, ":root");
  const lightBackground = backgroundToken(css, '[data-theme="light"]');
  const darkBackground = backgroundToken(css, ".dark");
  assert.equal(flowforceBackground, "0 0% 100%");
  assert.notEqual(lightBackground, flowforceBackground);
  const darkLightness = darkBackground.match(/([\d.]+)%$/);
  assert.ok(darkLightness);
  assert.ok(Number(darkLightness[1]) <= 11, darkBackground);
}

function backgroundToken(css: string, selector: string): string {
  const marker = `${selector} {`;
  const start = css.indexOf(marker);
  assert.notEqual(start, -1, `missing ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const match = block.match(/--background:\s*([^;]+);/);
  assert.ok(match, selector);
  return match[1].trim();
}

function bootStoredTheme(stored: string | null) {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();
  const context = vm.createContext({
    localStorage: {
      getItem(key: string) {
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    },
    document: {
      documentElement: {
        setAttribute(name: string, value: string) {
          attributes.set(name, value);
        },
        classList: {
          add(token: string) {
            classes.add(token);
          },
          remove(token: string) {
            classes.delete(token);
          },
        },
      },
      querySelector() {
        return {
          setAttribute() {
            return undefined;
          },
        };
      },
    },
  });
  vm.runInContext(themeBootScript, context);
  return { dataTheme: attributes.get("data-theme") ?? null, classes };
}
