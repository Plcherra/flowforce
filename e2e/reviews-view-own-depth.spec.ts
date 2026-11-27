import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson, readFetchJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const PACK_FLAG_OVERRIDE_STORAGE_KEY = "flowforce:pack-flags";
const OWN_REVIEW_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PEER_REVIEW_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

let signedInUserId = "";
let peerUserId = "";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await pinTeamPack(page);
  await page.route("**/rest/v1/profiles*", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const testEmail = process.env.TEST_USER_EMAIL ?? "";
      const pin = (row: unknown) =>
        row && typeof row === "object"
          ? { ...(row as Record<string, unknown>), language: "en" }
          : row;
      const capture = (row: unknown) => {
        if (!row || typeof row !== "object") return;
        const record = row as { id?: string; email?: string | null };
        if (testEmail && record.email === testEmail && record.id) {
          signedInUserId = record.id;
        }
      };
      const body = Array.isArray(json) ? json.map(pin) : pin(json);
      if (Array.isArray(body)) {
        body.forEach(capture);
        const ids = body
          .map((item) =>
            item && typeof item === "object" && "id" in item
              ? String((item as { id: string }).id)
              : "",
          )
          .filter(Boolean);
        if (signedInUserId) {
          peerUserId = ids.find((id) => id !== signedInUserId) ?? peerUserId;
        }
      } else {
        capture(body);
      }
      return body;
    });
  });
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("reviews.view_own without manage hides peer rows and scopes KPI employees", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await blockReviewWrites(page);
  await signIn(page);
  await expect.poll(() => signedInUserId.length > 0, { timeout: 20_000 }).toBeTruthy();
  await injectOwnAndPeerReviews(page);
  await patchPermissionOverrides(
    page,
    ["reviews.manage", "reviews.view_own"],
    (key) => (key === "reviews.view_own" ? "allow" : "deny"),
  );

  await page.goto("/app/performance");
  await expect(page.getByTestId("performance-reviews-section")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(`performance-review-row-${OWN_REVIEW_ID}`)).toBeVisible();
  await expect(page.getByTestId(`performance-review-row-${PEER_REVIEW_ID}`)).toHaveCount(0);
  await expect(page.getByText("E2E peer review hidden")).toHaveCount(0);
  await expect(page.getByTestId("performance-kpi-employees")).toContainText("1");
  await expect(page.getByTestId("performance-kpi-review-score")).toContainText(
    "4.0 / 5",
  );
  await page.screenshot({ path: "/opt/cursor/artifacts/reviews-view-own-depth.png" });
});

test("reviews.manage shows both injected review rows", async ({ page }) => {
  test.setTimeout(180_000);
  await blockReviewWrites(page);
  await signIn(page);
  await expect.poll(() => signedInUserId.length > 0, { timeout: 20_000 }).toBeTruthy();
  await injectOwnAndPeerReviews(page);

  await page.goto("/app/performance");
  await expect(page.getByTestId("performance-reviews-section")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId(`performance-review-row-${OWN_REVIEW_ID}`)).toBeVisible();
  await expect(page.getByTestId(`performance-review-row-${PEER_REVIEW_ID}`)).toBeVisible();
  await expect(page.getByText("E2E peer review hidden")).toBeVisible();
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Fperformance");
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

async function blockReviewWrites(page: Page) {
  await page.route("**/rest/v1/performance_reviews*", async (route) => {
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

async function injectOwnAndPeerReviews(page: Page) {
  await page.route("**/rest/v1/performance_reviews*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const rows = Array.isArray(json) ? json : [];
    const companyId =
      rows[0] && typeof rows[0] === "object"
        ? ((rows[0] as { company_id?: string }).company_id ?? null)
        : null;
    const ownId = signedInUserId;
    const peerId = peerUserId || "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    if (!ownId) {
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify(rows),
      });
      return;
    }
    const createdAt = new Date().toISOString();
    const ownReview = {
      id: OWN_REVIEW_ID,
      company_id: companyId,
      employee_id: ownId,
      reviewerid: ownId,
      created_at: createdAt,
      updated_at: createdAt,
      review_cycle: "quarterly",
      summary: "E2E own review visible",
      score: 4,
    };
    const peerReview = {
      id: PEER_REVIEW_ID,
      company_id: companyId,
      employee_id: peerId,
      reviewerid: ownId,
      created_at: createdAt,
      updated_at: createdAt,
      review_cycle: "quarterly",
      summary: "E2E peer review hidden",
      score: 5,
    };
    const stripped = rows.filter(
      (row) =>
        (row as { id?: string }).id !== OWN_REVIEW_ID &&
        (row as { id?: string }).id !== PEER_REVIEW_ID,
    );
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...stripped, ownReview, peerReview]),
    });
  });
}

async function patchPermissionOverrides(
  page: Page,
  keys: readonly string[],
  resolve: (key: string) => "allow" | "deny",
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
      return !keys.includes(key);
    });
    const overrides = keys.map((key) => ({
      permission_key: key,
      permission_value: resolve(key),
    }));
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}