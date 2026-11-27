import { expect, test, type Page } from "@playwright/test";
import { fulfillGetWithJson } from "./routeJson";
import { missingE2eEnv } from "./required-env";

const LIST_ISSUE_TASK_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa68";
const LIST_ISSUE_KEYS = ["tasks.list_issues.read", "tasks.list_issues.act"] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.beforeAll(() => {
  const missing = missingE2eEnv();
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}. See e2e/README.md.`);
  }
});

test("list issues: mark done issues task write with act permission", async ({ page }) => {
  test.setTimeout(180_000);
  let statusWriteAttempts = 0;
  await installListIssueTask(page, () => {
    statusWriteAttempts += 1;
  });
  await patchListIssuePermissions(page, { read: "allow", act: "allow" });
  await pinNonOwnerStaff(page);
  await signIn(page);

  await page.goto("/app/tasks");
  await page.getByTestId("tasks-mode-all").click();
  const gather = page.getByTestId("list-issue-gather");
  await expect(gather).toBeVisible({ timeout: 30_000 });
  await expect(gather.getByText("e2e list issue depth act")).toBeVisible();

  const doneButton = page.getByTestId(`list-issue-done-${LIST_ISSUE_TASK_ID}`);
  await expect(doneButton).toBeVisible();
  await doneButton.click();
  await expect.poll(() => statusWriteAttempts >= 1, { timeout: 15_000 }).toBe(true);

  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-list-issues-mark-done.png" });
});

test("list issues: owner keeps mark done when act grant is read-only", async ({ page }) => {
  test.setTimeout(180_000);
  let statusWriteAttempts = 0;
  await installListIssueTask(page, () => {
    statusWriteAttempts += 1;
  });
  await patchListIssuePermissions(page, { read: "allow", act: "deny" });
  await signIn(page);

  await page.goto("/app/tasks");
  await page.getByTestId("tasks-mode-all").click();
  await expect(page.getByTestId("list-issue-gather")).toBeVisible({ timeout: 30_000 });

  const doneButton = page.getByTestId(`list-issue-done-${LIST_ISSUE_TASK_ID}`);
  await expect(doneButton).toBeVisible();
  await doneButton.click();
  await expect.poll(() => statusWriteAttempts >= 1, { timeout: 15_000 }).toBe(true);
  await page.screenshot({ path: "/opt/cursor/artifacts/tasks-list-issues-owner-read-grant.png" });
});

async function signIn(page: Page) {
  const email = process.env.TEST_USER_EMAIL ?? "";
  const password = process.env.TEST_USER_PASSWORD ?? "";
  await page.goto("/auth?redirectTo=%2Fapp%2Ftasks");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/app\//, { timeout: 30_000 });
}

async function installListIssueTask(page: Page, onWrite?: () => void) {
  await page.unroute("**/rest/v1/tasks*").catch(() => undefined);
  await page.route("**/rest/v1/tasks*", async (route) => {
    const method = route.request().method();
    if (method !== "GET") {
      onWrite?.();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: LIST_ISSUE_TASK_ID, status: "completed" }),
      });
      return;
    }
    const response = await route.fetch();
    const json = (await response.json()) as unknown;
    const rows = Array.isArray(json) ? [...json] : [];
    const hasFixture = rows.some(
      (row) =>
        row &&
        typeof row === "object" &&
        (row as { id?: string }).id === LIST_ISSUE_TASK_ID,
    );
    if (!hasFixture) {
      const now = new Date().toISOString();
      rows.unshift({
        id: LIST_ISSUE_TASK_ID,
        title: "e2e list issue depth act",
        description: null,
        status: "todo",
        priority: "medium",
        assigned_to: null,
        created_by: "00000000-0000-4000-8000-000000000001",
        goal_id: null,
        due_date: null,
        estimated_hours: null,
        actual_hours: null,
        attachments: null,
        completed_at: null,
        created_at: now,
        links: { list_issue_kind: "missing_required" },
        parent_task_id: null,
        origin_event_id: null,
        tags: null,
        source: "form",
        company_id: null,
        updated_at: now,
      });
    }
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(rows),
    });
  });
}

async function pinNonOwnerStaff(page: Page) {
  await page.unroute("**/rest/v1/profiles*").catch(() => undefined);
  await page.route("**/rest/v1/profiles*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await fulfillGetWithJson(route, (json) => {
      const demote = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        return {
          ...(row as Record<string, unknown>),
          role: "staff",
          language: "en",
        };
      };
      return Array.isArray(json) ? json.map(demote) : demote(json);
    });
  });
  await page.route("**/rest/v1/rpc/get_company_roles", async (route) => {
    await fulfillGetWithJson(route, (json) => {
      const demote = (row: unknown) => {
        if (!row || typeof row !== "object") return row;
        const record = row as Record<string, unknown>;
        const rawPermissions = record.permissions;
        let permissions: Record<string, unknown> = {};
        if (typeof rawPermissions === "string") {
          try {
            permissions = JSON.parse(rawPermissions) as Record<string, unknown>;
          } catch {
            permissions = {};
          }
        } else if (rawPermissions && typeof rawPermissions === "object") {
          permissions = { ...(rawPermissions as Record<string, unknown>) };
        }
        return {
          ...record,
          product_level: "staff",
          hierarchy_level:
            typeof record.hierarchy_level === "number" ? record.hierarchy_level : 1,
          permissions,
        };
      };
      return Array.isArray(json) ? json.map(demote) : demote(json);
    });
  });
}

async function patchListIssuePermissions(
  page: Page,
  grants: { read: "allow" | "deny"; act: "allow" | "deny" },
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
      return !LIST_ISSUE_KEYS.includes(key as (typeof LIST_ISSUE_KEYS)[number]);
    });
    const overrides = [
      {
        permission_key: "tasks.list_issues.read",
        permission_value: grants.read,
      },
      {
        permission_key: "tasks.list_issues.act",
        permission_value: grants.act,
      },
    ];
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify([...overrides, ...kept]),
    });
  });
}