export const mobileAuthRedirectParam = "redirectTo";

export const mobileAuthRequiredFlows = [
  "login",
  "signup",
  "invite_signup",
  "onboarding_redirect",
  "session_restore",
  "logout",
  "deep_link_restore",
  "app_resume_refresh",
  "app_shell_error_states",
] as const;

export const mobileAuthRouteContract = {
  auth: "/auth",
  dashboard: "/app/dashboard",
  onboarding: "/company-registration",
  reset: "/auth?reset=true",
  signup: "/auth?intent=signup",
} as const;

export const mobileAuthErrorStates = [
  "missing_supabase_configuration",
  "invalid_or_expired_invite",
  "password_reset_failed",
  "session_restore_failed",
  "unsafe_redirect_rejected",
  "native_device_verification_requires_capacitor_runtime",
] as const;

const SAFE_REDIRECT_PREFIXES = [
  "/app",
  "/auth",
  "/company-registration",
  "/onboarding",
  "/register",
  "/pricing",
  "/features",
] as const;

function hasUnsafeControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

export function isSafeMobileAuthRedirect(value: string | null | undefined) {
  if (!value) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (hasUnsafeControlCharacter(value)) return false;

  try {
    const parsed = new URL(value, "https://flowforce.local");
    if (parsed.origin !== "https://flowforce.local") return false;

    return SAFE_REDIRECT_PREFIXES.some(
      (prefix) =>
        parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
  } catch {
    return false;
  }
}

export function getSafeMobileAuthRedirect(
  value: string | null | undefined,
  fallback = mobileAuthRouteContract.dashboard,
) {
  return isSafeMobileAuthRedirect(value) ? value : fallback;
}

export function buildMobileAuthRedirectPath(pathname: string, search = "") {
  const target = getSafeMobileAuthRedirect(
    `${pathname}${search}`,
    mobileAuthRouteContract.dashboard,
  );
  return `${mobileAuthRouteContract.auth}?${mobileAuthRedirectParam}=${encodeURIComponent(target)}`;
}

export function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function buildSameOriginAuthUrl(path: string) {
  const origin = getBrowserOrigin();
  if (!origin) return path;
  return new URL(path, origin).toString();
}

export function getMobileSignUpRedirectUrl() {
  return buildSameOriginAuthUrl(mobileAuthRouteContract.signup);
}

export function getMobilePasswordResetRedirectUrl() {
  return buildSameOriginAuthUrl(mobileAuthRouteContract.reset);
}

export function getMobileInviteRedirectUrl(inviteToken: string) {
  const invite = encodeURIComponent(inviteToken);
  return buildSameOriginAuthUrl(`${mobileAuthRouteContract.auth}?invite=${invite}`);
}

export function registerMobileAppResumeHandler(callback: () => void) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") callback();
  };

  window.addEventListener("focus", callback);
  window.addEventListener("pageshow", callback);
  window.addEventListener("resume", callback);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", callback);
    window.removeEventListener("pageshow", callback);
    window.removeEventListener("resume", callback);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

export function isMobileAuthRoutingReady() {
  return (
    mobileAuthRequiredFlows.length === 9 &&
    mobileAuthErrorStates.includes("unsafe_redirect_rejected") &&
    mobileAuthErrorStates.includes(
      "native_device_verification_requires_capacitor_runtime",
    ) &&
    getSafeMobileAuthRedirect("/app/tasks?tab=today") ===
      "/app/tasks?tab=today" &&
    getSafeMobileAuthRedirect("https://evil.example/app") ===
      mobileAuthRouteContract.dashboard
  );
}
