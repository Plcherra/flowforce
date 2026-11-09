import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

const DOC_KEYS = ["documents.view", "documents.manage"] as const;
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

test("resources getting started guide renders", async ({ page }) => {
  test.setTimeout(120_000);
  await pinTeamPack(page);
  await signIn(page);
  await page.goto("/app/resources/docs/getting-started");
  await expect(page.getByTestId("resources-getting-started")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Getting Started Guide" }),
  ).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-getting-started.png" });
});

test("report inbox upload follows documents.manage", async ({ page }) => {
  test.setTimeout(180_000);
  await pinInsightsPack(page);
  await blockDocumentWrites(page);
  await signIn(page);

  await page.goto("/app/reports");
  await expect(page.getByRole("heading", { name: "Report Inbox" })).toBeVisible({
    timeout: 30_000,
  });
  const upload = page.getByTestId("reports-upload-button");
  await expect(upload).toBeEnabled();
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-reports-upload-on.png" });

  await denyKeys(page, [...DOC_KEYS]);
  await page.reload();
  await expect(page.getByTestId("reports-upload-button")).toBeDisabled();
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-reports-upload-off.png" });
});

test("onboarding settings company documents upload is visible for managers", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockDocumentWrites(page);
  await signIn(page);

  await allowKeys(page, ["documents.manage"]);
  await page.goto("/app/settings?tab=onboarding");
  await expect(page.getByTestId("onboarding-settings")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("onboarding-documents")).toBeVisible();
  await expect(page.getByTestId("onboarding-document-upload")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/docs-onboarding-manage-on.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Freports");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function pinInsightsPack(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: PACK_FLAG_OVERRIDE_STORAGE_KEY,
      value: { team: false, insights: true, stock: false },
    },
  );
}

async function blockDocumentWrites(page: Page) {
  for (const pattern of ["**/rest/v1/documents*", "**/storage/v1/object/**"]) {
    await page.route(pattern, async (route) => {
      const method = route.request().method();
      if (method === "GET" || method === "HEAD") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  }
}

async function denyKeys(page: Page, keys: readonly string[]) {
  await patchPermissions(page, keys, "deny");
}

async function allowKeys(page: Page, keys: readonly string[]) {
  await patchPermissions(page, keys, "allow");
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

async function patchPermissions(
  page: Page,
  keys: readonly string[],
  value: "deny" | "allow",
) {
  await page.unroute("**/rest/v1/user_permissions*").catch(() => undefined);
  await page.route("**/rest/v1/user_permissions*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? json : [];
    const kept = rows.filter((row) => {
      const key =
        row && typeof row === "object"
          ? (row as { permission_key?: string }).permission_key
          : "";
      return !keys.includes(key as (typeof keys)[number]);
    });
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: value,
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}
