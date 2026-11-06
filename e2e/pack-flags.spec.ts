import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";

const OPS_NAV = ["enhanced-scheduling", "tasks", "messages", "employees", "forms"] as const;

const GATED_NAV = [
  "inventory",
  "expenses",
  "reports",
  "analytics",
  "ai-insights",
  "operations",
  "performance",
  "recognition",
  "leaderboard",
  "learning-center",
  "certifications",
  "resources",
] as const;

const GATED_ROUTES = [
  { path: "/app/inventory", pack: "stock" },
  { path: "/app/reports", pack: "insights" },
  { path: "/app/operations", pack: "insights" },
  { path: "/app/performance", pack: "team" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("hides Team, Insights, and Stock when pack flags are off", async ({ page }) => {
  await pinPackFlags(page, { team: false, insights: false, stock: false });
  await signIn(page);
  await expectPackFlags(page, { team: false, insights: false, stock: false });

  for (const key of OPS_NAV) {
    await expect(page.getByTestId(`nav-${key}`)).toBeVisible();
  }
  for (const key of GATED_NAV) {
    await expect(page.getByTestId(`nav-${key}`)).toHaveCount(0);
  }

  for (const route of GATED_ROUTES) {
    await page.goto(route.path);
    const gate = page.getByTestId("pack-route");
    await expect(gate).toHaveAttribute("data-state", "blocked", { timeout: 20_000 });
    await expect(gate).toHaveAttribute("data-pack", route.pack);
  }

  await page.getByTestId("pack-back-to-ops").click();
  await page.waitForURL(/\/app\/dashboard/, { timeout: 20_000 });

  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("pack-route")).toHaveCount(0);

  await page.goto("/app/tasks");
  await expect(page.getByTestId("tasks-page")).toBeVisible();
});

test("opens Team, Insights, and Stock when pack flags are on", async ({ page }) => {
  await pinPackFlags(page, { team: true, insights: true, stock: true });
  await signIn(page);
  await expectPackFlags(page, { team: true, insights: true, stock: true });

  for (const key of [...OPS_NAV, ...GATED_NAV]) {
    await expect(page.getByTestId(`nav-${key}`)).toBeVisible();
  }

  for (const route of GATED_ROUTES) {
    await page.goto(route.path);
    const gate = page.getByTestId("pack-route");
    await expect(gate).toHaveAttribute("data-state", "open", { timeout: 20_000 });
    await expect(gate).toHaveAttribute("data-pack", route.pack);
  }

  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("pack-route")).toHaveCount(0);
});

async function pinPackFlags(
  page: Page,
  flags: { team: boolean; insights: boolean; stock: boolean },
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    { key: PACK_FLAG_OVERRIDE_STORAGE_KEY, value: flags },
  );
}

async function expectPackFlags(
  page: Page,
  flags: { team: boolean; insights: boolean; stock: boolean },
) {
  const nav = page.getByTestId("bottom-nav");
  await expect(nav).toHaveAttribute("data-pack-ready", "true", { timeout: 20_000 });
  await expect(nav).toHaveAttribute("data-pack-team", String(flags.team));
  await expect(nav).toHaveAttribute("data-pack-insights", String(flags.insights));
  await expect(nav).toHaveAttribute("data-pack-stock", String(flags.stock));
}

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";

  await page.goto("/auth?redirectTo=%2Fapp%2Fdashboard");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
  await page.goto("/app/dashboard");
}
