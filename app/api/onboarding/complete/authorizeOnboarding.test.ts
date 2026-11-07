import assert from "node:assert/strict";

import { handleOnboardingComplete } from "./route";
import {
  authorizeOnboardingCaller,
  type OnboardingSessionUser,
} from "./authorizeOnboarding";
import { authorizeRemoteLog } from "../../logs/authorizeRemoteLog";

const sessionUser: OnboardingSessionUser = {
  id: "user-a",
  email: "owner@example.test",
  user_metadata: { first_name: "Ada" },
};

function onboardingRequest(input: {
  token?: string;
  userId?: string;
  email?: string;
}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (input.token) headers.set("authorization", `Bearer ${input.token}`);
  return new Request("http://localhost/api/onboarding/complete", {
    method: "POST",
    headers,
    body: JSON.stringify({
      userId: input.userId ?? "",
      userInfo: {
        firstName: "Ada",
        lastName: "Owner",
        email: input.email ?? "",
      },
      companyInfo: {
        name: "North Cafe",
        industry: "Food",
        size: "1-10 employees",
      },
    }),
  });
}

export async function runServiceRoleAuthTests() {
  let lookups = 0;
  const missing = await authorizeOnboardingCaller({
    authorizationHeader: null,
    bodyUserId: "user-b",
    bodyEmail: "other@example.test",
    getUser: async () => {
      lookups += 1;
      return { user: sessionUser };
    },
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.status, 401);
  assert.equal(lookups, 0);

  const invalid = await authorizeOnboardingCaller({
    authorizationHeader: "Bearer expired",
    bodyUserId: "",
    bodyEmail: "",
    getUser: async () => ({ user: null }),
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.status, 401);

  const wrongUser = await authorizeOnboardingCaller({
    authorizationHeader: "Bearer session-a",
    bodyUserId: "user-b",
    bodyEmail: sessionUser.email ?? "",
    getUser: async () => ({ user: sessionUser }),
  });
  assert.equal(wrongUser.ok, false);
  if (!wrongUser.ok) assert.equal(wrongUser.status, 403);

  const wrongEmail = await authorizeOnboardingCaller({
    authorizationHeader: "Bearer session-a",
    bodyUserId: sessionUser.id,
    bodyEmail: "other@example.test",
    getUser: async () => ({ user: sessionUser }),
  });
  assert.equal(wrongEmail.ok, false);
  if (!wrongEmail.ok) assert.equal(wrongEmail.status, 403);

  const matched = await authorizeOnboardingCaller({
    authorizationHeader: "Bearer session-a",
    bodyUserId: "",
    bodyEmail: "",
    getUser: async () => ({ user: sessionUser }),
  });
  assert.equal(matched.ok, true);
  if (matched.ok) {
    assert.equal(matched.userId, "user-a");
    assert.equal(matched.email, "owner@example.test");
  }

  const unauthenticatedRoute = await handleOnboardingComplete(
    onboardingRequest({
      userId: "user-b",
      email: "other@example.test",
    }),
    async () => {
      throw new Error("getUser must not run without a session");
    },
  );
  assert.equal(unauthenticatedRoute.status, 401);

  const mismatchedRoute = await handleOnboardingComplete(
    onboardingRequest({
      token: "session-a",
      userId: "user-b",
      email: "other@example.test",
    }),
    async () => ({ user: sessionUser }),
  );
  assert.equal(mismatchedRoute.status, 403);
  const mismatchedBody = (await mismatchedRoute.json()) as { message?: string };
  assert.match(mismatchedBody.message ?? "", /does not match/);

  const openLogs = authorizeRemoteLog({
    configuredToken: undefined,
    providedToken: null,
    bearerToken: null,
    sessionUserId: null,
    bearerVerified: false,
    bodyUserId: "user-b",
  });
  assert.equal(openLogs.ok, false);
  if (!openLogs.ok) assert.equal(openLogs.status, 401);

  const wrongLogToken = authorizeRemoteLog({
    configuredToken: "shipper-secret",
    providedToken: "nope",
    bearerToken: null,
    sessionUserId: null,
    bearerVerified: false,
    bodyUserId: "user-b",
  });
  assert.equal(wrongLogToken.ok, false);

  const spoofedLogUser = authorizeRemoteLog({
    configuredToken: undefined,
    providedToken: null,
    bearerToken: "session-a",
    sessionUserId: "user-a",
    bearerVerified: true,
    bodyUserId: "user-b",
  });
  assert.equal(spoofedLogUser.ok, false);
  if (!spoofedLogUser.ok) assert.equal(spoofedLogUser.status, 403);

  const sessionLog = authorizeRemoteLog({
    configuredToken: undefined,
    providedToken: null,
    bearerToken: "session-a",
    sessionUserId: "user-a",
    bearerVerified: true,
    bodyUserId: "user-a",
  });
  assert.equal(sessionLog.ok, true);
  if (sessionLog.ok) assert.equal(sessionLog.userId, "user-a");
}
