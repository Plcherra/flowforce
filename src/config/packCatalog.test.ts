import assert from "node:assert/strict";
import { isStripeTestSecret } from "@/server/billing/stripeTestMode";
import {
  OPTIONAL_PACK_IDS,
  OPS_MONTHLY_USD,
  OPS_PRICE_ENV,
  PACK_MONTHLY_USD,
  PACK_PLACEHOLDER_MONTHLY_USD,
  readOpsPriceId,
  PACK_PRICE_ENV,
  isPackBillingMetadata,
  packCheckoutIsPaid,
  packPriceCanCheckout,
  packSubscriptionGrantsAccess,
  packSubscriptionRevokesAccess,
  readPackCheckoutMetadata,
  readPackPriceId,
  withBasicOpsPackFlags,
  withPackDisabled,
  withPackEnabled,
} from "./packCatalog";

export function runPackCatalogTests() {
  assert.deepEqual(OPTIONAL_PACK_IDS, ["team", "insights", "stock"]);
  assert.equal(PACK_PRICE_ENV.team, "STRIPE_PRICE_PACK_TEAM");
  assert.equal(PACK_PRICE_ENV.insights, "STRIPE_PRICE_PACK_INSIGHTS");
  assert.equal(PACK_PRICE_ENV.stock, "STRIPE_PRICE_PACK_STOCK");
  assert.equal(OPS_PRICE_ENV, "STRIPE_PRICE_OPS");
  assert.equal(OPS_MONTHLY_USD, 59);
  assert.equal(readOpsPriceId({ STRIPE_PRICE_OPS: " price_ops " }), "price_ops");
  assert.equal(readOpsPriceId({}), null);
  assert.equal(
    readPackPriceId("team", { STRIPE_PRICE_PACK_TEAM: " price_team " }),
    "price_team",
  );
  assert.equal(readPackPriceId("stock", {}), null);
  assert.deepEqual(PACK_MONTHLY_USD, {
    team: 19,
    insights: 19,
    stock: 29,
  });
  assert.equal(PACK_PLACEHOLDER_MONTHLY_USD, PACK_MONTHLY_USD);
  assert.equal(packPriceCanCheckout({ recurring: { interval: "month" } }), true);
  assert.equal(packPriceCanCheckout({ recurring: { interval: "year" } }), false);
  assert.equal(packPriceCanCheckout({ recurring: null }), false);
  assert.equal(packPriceCanCheckout(null), false);

  assert.equal(isPackBillingMetadata({ kind: "pack" }), true);
  assert.equal(isPackBillingMetadata({ kind: "plan" }), false);
  assert.equal(readPackCheckoutMetadata({ kind: "pack", pack: "insights" }), "insights");
  assert.equal(readPackCheckoutMetadata({ kind: "pack", pack: "starter" }), null);
  assert.equal(packCheckoutIsPaid({ payment_status: "paid" }), true);
  assert.equal(packCheckoutIsPaid({ payment_status: "no_payment_required" }), true);
  assert.equal(packCheckoutIsPaid({ payment_status: "unpaid" }), false);
  assert.equal(isStripeTestSecret("sk_test_example"), true);
  assert.equal(isStripeTestSecret("rk_test_example"), true);
  assert.equal(isStripeTestSecret("sk_live_example"), false);
  assert.equal(isStripeTestSecret("rk_live_example"), false);
  assert.equal(isStripeTestSecret(" pk_test_example "), false);

  const enabled = withPackEnabled(
    {
      tenantManagement: { plan: "growth" },
      packFlags: { team: false, insights: true, stock: false },
    },
    "team",
  );
  assert.equal(
    (enabled.tenantManagement as { plan: string }).plan,
    "growth",
  );
  assert.deepEqual(enabled.packFlags, {
    ops: true,
    team: true,
    insights: true,
    stock: false,
  });

  const fresh = withBasicOpsPackFlags({ tenantManagement: { plan: "starter" } });
  assert.deepEqual(fresh.packFlags, {
    ops: true,
    team: false,
    insights: false,
    stock: false,
  });

  const existing = {
    packFlags: { team: true, insights: false, stock: false },
  };
  assert.equal(withBasicOpsPackFlags(existing), existing);

  const disabled = withPackDisabled(enabled, "insights");
  assert.deepEqual(disabled.packFlags, {
    ops: true,
    team: true,
    insights: false,
    stock: false,
  });
  assert.equal(
    (disabled.tenantManagement as { plan: string }).plan,
    "growth",
  );

  assert.equal(packSubscriptionGrantsAccess("active"), true);
  assert.equal(packSubscriptionGrantsAccess("trialing"), true);
  assert.equal(packSubscriptionGrantsAccess("canceled"), false);
  assert.equal(
    packSubscriptionRevokesAccess("active", "customer.subscription.updated"),
    false,
  );
  assert.equal(
    packSubscriptionRevokesAccess("active", "customer.subscription.deleted"),
    true,
  );
  assert.equal(
    packSubscriptionRevokesAccess("canceled", "customer.subscription.updated"),
    true,
  );
  assert.equal(
    packSubscriptionRevokesAccess("unpaid", "customer.subscription.updated"),
    true,
  );
  assert.equal(
    packSubscriptionRevokesAccess("incomplete_expired", "customer.subscription.updated"),
    true,
  );
}
