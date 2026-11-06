import assert from "node:assert/strict";
import {
  OPTIONAL_PACK_IDS,
  PACK_PRICE_ENV,
  isPackBillingMetadata,
  packCheckoutIsPaid,
  packPriceCanCheckout,
  readPackCheckoutMetadata,
  readPackPriceId,
  withBasicOpsPackFlags,
  withPackEnabled,
} from "./packCatalog";

export function runPackCatalogTests() {
  assert.deepEqual(OPTIONAL_PACK_IDS, ["team", "insights", "stock"]);
  assert.equal(PACK_PRICE_ENV.team, "STRIPE_PRICE_PACK_TEAM");
  assert.equal(PACK_PRICE_ENV.insights, "STRIPE_PRICE_PACK_INSIGHTS");
  assert.equal(PACK_PRICE_ENV.stock, "STRIPE_PRICE_PACK_STOCK");
  assert.equal(
    readPackPriceId("team", { STRIPE_PRICE_PACK_TEAM: " price_team " }),
    "price_team",
  );
  assert.equal(readPackPriceId("stock", {}), null);
  assert.equal(packPriceCanCheckout({ recurring: { interval: "month" } }), true);
  assert.equal(packPriceCanCheckout({ recurring: null }), false);
  assert.equal(packPriceCanCheckout(null), false);

  assert.equal(isPackBillingMetadata({ kind: "pack" }), true);
  assert.equal(isPackBillingMetadata({ kind: "plan" }), false);
  assert.equal(readPackCheckoutMetadata({ kind: "pack", pack: "insights" }), "insights");
  assert.equal(readPackCheckoutMetadata({ kind: "pack", pack: "starter" }), null);
  assert.equal(packCheckoutIsPaid({ payment_status: "paid" }), true);
  assert.equal(packCheckoutIsPaid({ payment_status: "unpaid" }), false);

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
}
