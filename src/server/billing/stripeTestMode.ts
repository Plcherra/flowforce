/**
 * Pack checkout, pack portal, and pack confirmation accept Stripe test keys only.
 * Live secret keys (sk_live_ / rk_live_) are refused before any Stripe call.
 */

export class StripeTestModeError extends Error {
  constructor() {
    super("Pack billing accepts a Stripe test key only.");
    this.name = "StripeTestModeError";
  }
}

export function isStripeTestSecret(value: string | undefined | null): boolean {
  const secret = value?.trim() ?? "";
  return secret.startsWith("sk_test_") || secret.startsWith("rk_test_");
}

export function assertStripeTestSecret(value: string | undefined | null): void {
  if (!isStripeTestSecret(value)) {
    throw new StripeTestModeError();
  }
}
