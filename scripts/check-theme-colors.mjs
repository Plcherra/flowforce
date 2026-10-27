import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const baselinePath = path.join(root, "scripts", "theme-color-baseline.json");
const roots = ["src", "app", "tests"];
const skipDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
]);
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".html",
  ".svg",
  ".md",
  ".json",
]);

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const shade = "50|100|200|300|400|500|600|700|800|900|950";
const utility =
  "bg|text|fill|stroke|from|to|via|divide|placeholder|caret|decoration|accent|shadow|ring-offset|ring|outline|border(?:-[trblxy])?";

const numberedPalette = new RegExp(
  `\\b(?:[a-z0-9-]+:)*(?:${utility})-(?:${palette})-(?:${shade})(?:\\/\\d{1,3})?\\b`,
  "g",
);
const blackWhitePalette = new RegExp(
  `\\b(?:[a-z0-9-]+:)*(?:${utility})-(?:black|white)(?:\\/\\d{1,3})?\\b`,
  "g",
);
const hexColor = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (textExtensions.has(path.extname(entry.name))) files.push(full);
  }
}

function findThemeColors(source) {
  const found = new Set();
  for (const pattern of [numberedPalette, blackWhitePalette, hexColor]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (match[0]) found.add(match[0]);
    }
  }
  return [...found].sort();
}

function scanTree() {
  const files = [];
  for (const dir of roots) walk(path.join(root, dir), files);
  const matches = {};
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const found = findThemeColors(fs.readFileSync(file, "utf8"));
    if (found.length > 0) matches[relative] = found;
  }
  return matches;
}

function loadBaseline() {
  const raw = fs.readFileSync(baselinePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("theme color baseline must be a JSON object");
  }
  return parsed;
}

// Literal colors that stay after the baseline is empty.
// Decision 8: position colors, shift colors, rich-text color, post backgrounds,
// and the vendor list. Phase 2 locks the viewport theme color. Decision 4 locks
// the logo plate. Role colors match the colors planted in the database.
// Signature ink and printable schedules use real colors outside the theme.
const allowedFiles = new Set([
  "app/globals.css",
  "app/layout.tsx",
  "src/lib/theme/applyTheme.ts",
  "src/lib/theme/applyTheme.test.ts",
  "src/features/system/components/LogoEditorDialog.tsx",
  "src/features/positions/components/PositionManagement.tsx",
  "src/features/positions/components/PositionManagementDialog.tsx",
  "src/features/scheduling/components/DayView.tsx",
  "src/features/scheduling/components/drag-drop/ScheduleTemplatesPanel.tsx",
  "src/features/scheduling/components/drag-drop/ShiftChip.tsx",
  "src/features/scheduling/components/DragDropScheduleCalendar.tsx",
  "src/features/scheduling/components/MonthView.tsx",
  "src/features/scheduling/components/ShiftDetailsPanel.tsx",
  "src/features/scheduling/components/ShiftWizardDialog.tsx",
  "src/features/scheduling/components/WeekView.tsx",
  "src/features/scheduling/constants/templates.ts",
  "src/features/scheduling/utils/weekHelpers.ts",
  "src/features/scheduling/utils/weekTemplateSerializer.test.ts",
  "src/features/scheduling/utils/weekTemplateSerializer.ts",
  "src/lib/api/scheduleGateway.mock.ts",
  "tests/playwright/scheduling-phase-04-opaque-chips.spec.ts",
  "src/features/company-updates/wizard/RichTextEditor.tsx",
  "src/features/company-updates/wizard/steps/DesignContentStep.tsx",
  "src/features/company-updates/wizard/steps/TemplateSelectionStep.tsx",
  "src/features/company-updates/wizard/useCompanyUpdateDraft.ts",
  "src/features/forms/components/builder/RichTextContentEditor.tsx",
  "src/features/forms/components/fields/SignatureField.tsx",
  "src/data/updateTemplates.ts",
  "src/features/roles/constants/productRoleContract.json",
  "src/features/system/hooks/useAdminSettings.ts",
  "src/hooks/useCompany.tsx",
  "src/hooks/useCompanyRoles.tsx",
  "src/hooks/useEvents.tsx",
]);

const found = scanTree();
const baseline = loadBaseline();
const missing = [];

for (const [file, colors] of Object.entries(found)) {
  if (allowedFiles.has(file)) continue;
  const allowed = new Set(Array.isArray(baseline[file]) ? baseline[file] : []);
  for (const color of colors) {
    if (!allowed.has(color)) missing.push(`${file}: ${color}`);
  }
}

if (missing.length > 0) {
  process.stderr.write(
    "Theme color check failed. These matches are not in the baseline:\n",
  );
  for (const line of missing) process.stderr.write(`${line}\n`);
  process.exit(1);
}

process.stdout.write("theme color check passed\n");
