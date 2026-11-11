import type { APIResponse, Route } from "@playwright/test";

/** Read JSON from a route.fetch() response before Playwright disposes it. */
export async function readFetchJson(response: APIResponse): Promise<unknown> {
  const raw = Buffer.from(await response.body()).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

/**
 * Intercept a REST GET: fetch upstream, transform JSON, fulfill. On fetch/dispose
 * errors (common during reload), passthrough so the test can continue.
 */
export async function fulfillGetWithJson(
  route: Route,
  transform: (json: unknown) => unknown,
): Promise<void> {
  const request = route.request();
  if (request.method() !== "GET") {
    await route.continue();
    return;
  }
  try {
    const response = await route.fetch();
    const json = await readFetchJson(response);
    const body = transform(json);
    await route.fulfill({
      status: response.status(),
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  } catch {
    await route.continue();
  }
}
