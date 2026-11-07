export type OnboardingSessionUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

export type OnboardingGetUser = (accessToken: string) => Promise<{
  user: OnboardingSessionUser | null;
}>;

export type OnboardingAuthDecision =
  | {
      ok: true;
      userId: string;
      email: string;
      user: OnboardingSessionUser;
    }
  | { ok: false; status: 401 | 403; message: string };

export function readBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)/i);
  return match?.[1] ?? null;
}

/**
 * The signed-in Supabase user is the only identity this route may provision. // pragma: allowlist secret
 * A client-supplied user id or email is checked only so a mismatch is rejected
 * instead of being used.
 */
export async function authorizeOnboardingCaller(input: {
  authorizationHeader: string | null;
  bodyUserId: string;
  bodyEmail: string;
  getUser: OnboardingGetUser;
}): Promise<OnboardingAuthDecision> {
  const token = readBearerToken(input.authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, message: "Missing authenticated session." };
  }

  const result = await input.getUser(token);
  const user = result.user;
  if (!user?.id) {
    return { ok: false, status: 401, message: "Unable to verify session." };
  }

  const sessionEmail = user.email?.trim().toLowerCase() ?? "";
  if (!sessionEmail) {
    return {
      ok: false,
      status: 401,
      message: "Unable to verify account before onboarding.",
    };
  }

  const bodyUserId = input.bodyUserId.trim();
  if (bodyUserId && bodyUserId !== user.id) {
    return {
      ok: false,
      status: 403,
      message: "Onboarding account does not match the signed-in session.",
    };
  }

  const bodyEmail = input.bodyEmail.trim().toLowerCase();
  if (bodyEmail && bodyEmail !== sessionEmail) {
    return {
      ok: false,
      status: 403,
      message: "Onboarding email does not match the signed-in session.",
    };
  }

  return { ok: true, userId: user.id, email: sessionEmail, user };
}
