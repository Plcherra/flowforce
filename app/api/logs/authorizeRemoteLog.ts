import { timingSafeEqual } from "node:crypto";

export type RemoteLogDecision =
  | { ok: true; userId: string | null }
  | { ok: false; status: 401 | 403; message: string };

function tokensMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Remote logs are written with the service role. Anonymous callers are
 * rejected. A bearer session wins over any user id in the body. The shared
 * ingest token remains the path for a server-side shipper.
 */
export function authorizeRemoteLog(input: {
  configuredToken: string | undefined;
  providedToken: string | null;
  bearerToken: string | null;
  sessionUserId: string | null;
  bearerVerified: boolean;
  bodyUserId: string | null;
}): RemoteLogDecision {
  if (input.bearerToken) {
    if (!input.bearerVerified || !input.sessionUserId) {
      return { ok: false, status: 401, message: "Unable to verify session." };
    }
    if (input.bodyUserId && input.bodyUserId !== input.sessionUserId) {
      return {
        ok: false,
        status: 403,
        message: "Log user does not match the signed-in session.",
      };
    }
    return { ok: true, userId: input.sessionUserId };
  }

  const expected = input.configuredToken?.trim() ?? "";
  const provided = input.providedToken?.trim() ?? "";
  if (!expected || !provided || !tokensMatch(provided, expected)) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true, userId: input.bodyUserId };
}
