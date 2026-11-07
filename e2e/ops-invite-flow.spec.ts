import { expect, test, type Page } from "@playwright/test";
import { missingE2eEnv } from "./required-env";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
    window.sessionStorage.setItem(
      "flowforce:pack-flags",
      JSON.stringify({ team: false, insights: false, stock: false }),
    );
  });
  await page.route("**/rest/v1/profiles*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() !== "GET" || !url.includes("language")) {
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
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`,
    );
  }
});

test("walks invite, company basics, and a first shift without storing the invite", async ({
  page,
}) => {
  const captured = await watchInvite(page);

  await page.getByTestId("invite-continue").click();
  await expect(page.getByTestId("ops-invite-flow")).toHaveAttribute(
    "data-step",
    "basics",
  );
  await expect(page.getByTestId("ops-basics-skip")).toBeVisible();
  const basicsError = page.getByTestId("ops-basics-error");
  const welcome = page.getByTestId("ops-basics-welcome");
  await expect(welcome.or(basicsError)).toBeVisible({ timeout: 20_000 });
  if (await welcome.count()) {
    const text = (await welcome.innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain("Demo workspace");
    expect(text.toLowerCase()).not.toContain("example.com");
    await expect(page.getByTestId("ops-basics-docs")).toBeVisible();
    await expect(page.getByTestId("ops-basics-rules")).toBeVisible();
  }
  await page.getByTestId("ops-basics").screenshot({
    path: "/opt/cursor/artifacts/ops-invite-basics.png",
  });
  expect(captured.calls).toBe(0);

  await page.getByTestId("ops-basics-skip").click();
  await expect(page.getByTestId("ops-invite-flow")).toHaveAttribute(
    "data-step",
    "shift",
  );
  await page.getByTestId("ops-shift-date").fill("2026-11-09");
  await page.getByTestId("ops-shift-start").fill("09:00");
  await page.getByTestId("ops-shift-end").fill("17:00");
  await page.getByTestId("ops-shift").screenshot({
    path: "/opt/cursor/artifacts/ops-invite-shift.png",
  });
  await page.getByTestId("ops-shift-save").click();

  await expect.poll(() => captured.body?.email).toBe(captured.email);
  if (captured.storeId) {
    expect(captured.body?.locationId).toBe(captured.storeId);
  } else {
    expect(captured.body?.locationId ?? "").not.toMatch(/walk-in/i);
  }
  expect(captured.calls).toBe(1);
  const shift = captured.body?.firstShift;
  expect(shift?.start).toBeTruthy();
  expect(shift?.end).toBeTruthy();
  expect(new Date(shift?.end ?? 0).getTime()).toBeGreaterThan(
    new Date(shift?.start ?? 0).getTime(),
  );
});

test("skips company basics and sends the invite without a first shift", async ({
  page,
}) => {
  const captured = await watchInvite(page);
  await page.getByTestId("invite-continue").click();
  await expect(page.getByTestId("ops-basics-continue")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("ops-basics-continue").click();
  await expect(page.getByTestId("ops-invite-flow")).toHaveAttribute(
    "data-step",
    "shift",
  );
  expect(captured.calls).toBe(0);
  await page.getByTestId("ops-shift-skip").click();
  await expect.poll(() => captured.body?.email).toBe(captured.email);
  expect(captured.body?.firstShift).toBeUndefined();
  expect(captured.calls).toBe(1);
});

async function openOpsInvite(page: Page): Promise<{ storeId: string | null; email: string }> {
  await signIn(page);
  await page.goto("/app/employees");
  await expect(page.getByTestId("employees-page")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("employees-invite-button").first().click();
  const dialog = page.getByTestId("invite-dialog");
  await expect(dialog).toBeVisible();
  const flow = dialog.getByTestId("ops-invite-flow");
  await expect(flow).toHaveAttribute("data-step", "invite", { timeout: 20_000 });
  await expect(dialog.getByTestId("invite-class")).toHaveAttribute(
    "data-selected",
    "true",
    { timeout: 20_000 },
  );

  const location = dialog.getByTestId("invite-location");
  let storeId: string | null = null;
  if (await location.isVisible().catch(() => false)) {
    await location.click();
    const option = page.getByTestId("invite-location-option").first();
    await expect(option).toBeVisible();
    storeId = await option.getAttribute("data-location-id");
    expect(storeId).toBeTruthy();
    await option.click();
  }
  const email = `e2e-ops-${Date.now()}@example.com`;
  await dialog.locator('input[type="email"]').fill(email);
  return { storeId, email };
}

async function watchInvite(page: Page) {
  const captured: {
    calls: number;
    email: string;
    storeId: string | null;
    body: { email?: string; locationId?: string; firstShift?: { start?: string; end?: string } } | null;
  } = { calls: 0, email: "", storeId: null, body: null };

  await page.route("**/api/employees/invite", async (route) => {
    const body = route.request().postDataJSON() as {
      invites?: Array<{
        email?: string;
        locationId?: string;
        firstShift?: { start?: string; end?: string };
      }>;
    };
    captured.calls += 1;
    captured.body = body.invites?.[0] ?? null;
    const email = captured.body?.email ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        inviteLink: null,
        results: [{ ok: true, email, inviteLink: null, firstShift: "skipped" }],
      }),
    });
  });

  const opened = await openOpsInvite(page);
  captured.email = opened.email;
  captured.storeId = opened.storeId;
  return captured;
}

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Femployees");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}
