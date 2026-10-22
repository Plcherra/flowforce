type AuthUserIdentity = {
  id?: string;
  updated_at?: string;
} | null;

type AuthSessionIdentity = {
  access_token?: string;
  user?: { id?: string } | null;
} | null;

/** Same signed-in person, so a tab resume must not replace React state. */
export function sameAuthUser(
  previous: AuthUserIdentity | undefined,
  next: AuthUserIdentity | undefined,
): boolean {
  if (!previous && !next) return true;
  if (!previous || !next) return false;
  return previous.id === next.id && previous.updated_at === next.updated_at;
}

/** Same token and person. A new object from getSession is not a new sign-in. */
export function sameAuthSession(
  previous: AuthSessionIdentity | undefined,
  next: AuthSessionIdentity | undefined,
): boolean {
  if (!previous && !next) return true;
  if (!previous || !next) return false;
  return (
    previous.access_token === next.access_token &&
    previous.user?.id === next.user?.id
  );
}

/**
 * The first fetch for a person blocks the UI. A repeat fetch for that same
 * person keeps the current roles on screen, so the bottom bar does not collapse.
 */
export function roleFetchBlocksUi(
  loadedUserId: string | null,
  userId: string,
): boolean {
  return loadedUserId !== userId;
}
