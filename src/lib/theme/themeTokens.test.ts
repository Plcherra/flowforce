import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FLOWFORCE_BLUE = "217 91% 60%";
const FLOWFORCE_FOREGROUND = "210 40% 98%";
const FLOWFORCE_SECONDARY = "226 71% 40%";
const LAVENDER = "270 80% 90%";

function extractBlock(css: string, selector: string): string {
  const marker = `${selector} {`;
  const start = css.indexOf(marker);
  assert.notEqual(start, -1, `missing ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, index);
    }
  }
  throw new Error(`unclosed ${selector}`);
}

function readTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2];
    if (!name || !value) continue;
    tokens.set(name, value.trim());
  }
  return tokens;
}

export function runThemeTokenTests() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const css = fs.readFileSync(path.resolve(here, "../../../app/globals.css"), "utf8");
  const root = readTokens(extractBlock(css, ":root"));
  const light = readTokens(extractBlock(css, '[data-theme="light"]'));
  const dark = readTokens(extractBlock(css, ".dark"));
  const rootBlock = extractBlock(css, ":root");
  const darkBlock = extractBlock(css, ".dark");

  for (const name of ["--primary", "--ring", "--sidebar-primary"]) {
    assert.equal(root.get(name), FLOWFORCE_BLUE, name);
    assert.equal(dark.get(name), FLOWFORCE_BLUE, name);
  }

  for (const name of ["--primary-foreground", "--sidebar-primary-foreground"]) {
    assert.equal(root.get(name), FLOWFORCE_FOREGROUND, name);
  }

  for (const name of ["--secondary", "--brand-secondary"]) {
    assert.equal(root.get(name), FLOWFORCE_SECONDARY, name);
    assert.equal(dark.get(name), root.get(name), name);
  }

  assert.equal(root.get("--secondary-foreground"), FLOWFORCE_FOREGROUND);
  assert.equal(dark.get("--secondary-foreground"), root.get("--secondary-foreground"));
  assert.equal(root.get("--accent"), LAVENDER);
  assert.equal(root.get("--tertiary"), LAVENDER);
  assert.equal(rootBlock.includes("174 78% 72%"), false);
  assert.equal(rootBlock.includes("259 76% 87%"), false);
  assert.equal(darkBlock.includes("175 100% 75%"), false);
  assert.equal(darkBlock.includes("129 42% 72%"), false);

  const lightSurfaces = new Set(["--background", "--card", "--popover"]);

  assert.equal(light.size, root.size);
  for (const [name, value] of root) {
    if (name === "--input") {
      assert.equal(value, "41 77% 91%");
      assert.equal(light.get(name), "214.3 31.8% 91.4%");
      continue;
    }
    if (lightSurfaces.has(name)) continue;
    assert.equal(light.get(name), value, name);
  }

  assert.equal(root.get("--background"), "0 0% 100%");
  assert.equal(root.get("--card"), "0 0% 100%");
  assert.equal(root.get("--popover"), "0 0% 100%");
  assert.equal(light.get("--background"), "210 40% 96%");
  assert.notEqual(light.get("--background"), root.get("--background"));
  assert.equal(light.get("--card"), "210 40% 98%");
  assert.equal(light.get("--popover"), "210 40% 98%");

  const darkBackground = dark.get("--background");
  assert.ok(darkBackground);
  const darkLightness = darkBackground.match(/([\d.]+)%$/);
  assert.ok(darkLightness);
  assert.ok(Number(darkLightness[1]) <= 11, darkBackground);
}
