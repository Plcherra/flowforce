import { expect, type Page } from "@playwright/test";

/** Prefixes used by task e2e specs — must stay in sync with spec title patterns. */
export const E2E_TASK_TITLE_PREFIXES = [
  "e2e-task-",
  "e2e-due-by-",
  "e2e-p1-shift-",
  "e2e task ",
  "e2e list issue",
  "e2e missed opening",
] as const;

export function isE2eTaskTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return E2E_TASK_TITLE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix.toLowerCase()),
  );
}

export async function deleteTaskFromList(page: Page, title: string) {
  if (!page.url().includes("/app/tasks")) {
    await page.goto("/app/tasks");
  }
  await expect(page.getByTestId("tasks-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("tasks-mode-all").click();
  await page.locator("#tasks-search").fill(title);

  const card = page.getByTestId("tasks-list").getByText(title, { exact: true });
  const visible = await card
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;

  const dialog = page.getByRole("dialog");
  let opened = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await card.click();
    opened = await dialog
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
  }
  if (!opened) {
    throw new Error("Task details dialog did not open for cleanup");
  }

  const deleteButton = dialog.getByRole("button", { name: /delete/i });
  if ((await deleteButton.count()) === 0) {
    await page.keyboard.press("Escape");
    return;
  }

  page.once("dialog", (confirm) => {
    void confirm.accept();
  });
  await deleteButton.click();
  await expect(card).toHaveCount(0, { timeout: 20_000 });
}