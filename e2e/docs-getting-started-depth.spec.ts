import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || !request.url().includes("language")) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const pin = (row: unknown) =>
      row && typeof row === "object"
        ? { ...(row as Record<string, unknown>), language: "en" }
        : row;
    const body = Array.isArray(json) ? json.map(pin) : pin(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("getting started guide lists setup steps and next-step links", async ({ page }) => {
  test.setTimeout(120_000);
  await pinTeamPack(page);
  await signIn(page);

  await page.goto("/app/resources/docs/getting-started");
  await expect(page.getByTestId("resources-getting-started")).toBeVisible({
    timeout: 30_000,
  });

  for (let index = 0; index < 4; index += 1) {
    const step = page.getByTestId(`getting-started-step-${index}`);
    await expect(step).toBeVisible();
    await expect(step.getByRole("heading", { level: 4 })).toBeVisible();
  }

  await expect(page.getByTestId("getting-started-step-0")).toContainText(
    "Create Your Account",
  );
  await expect(page.getByTestId("getting-started-next-steps")).toBeVisible();
  await expect(
    page.getByText("API Documentation for integration guidance"),
  ).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-getting-started-walkthrough.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fresources%2Fdocs%2Fgetting-started");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function pinTeamPack(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: PACK_FLAG_OVERRIDE_STORAGE_KEY,
      value: { team: true, insights: false, stock: false },
    },
  );
}