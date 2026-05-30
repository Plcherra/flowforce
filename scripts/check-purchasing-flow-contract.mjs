import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const doc = readText("docs/purchasing-supplier-flow.md");
const repository = readText(
  "src/features/inventory/repositories/purchasingRepository.ts",
);
const types = readText("src/features/inventory/hooks/types.ts");
const migration = readText(
  "supabase/migrations/20260528000500_phase5_purchasing_supplier_flow_contract.sql",
);
const roadmap = readText("docs/roadmap/05-inventory-finance-cost-engine.md");
const checklist = readText("docs/checklists/LAUNCH-READINESS-CHECKLIST.md");

requireIncludes(
  doc,
  [
    "inv_purchases",
    "inv_purchase_lines",
    "inv_stock_lots",
    "purchase_receipt",
    "latest received supplier cost",
    "cost_purchase_receipts_v",
  ],
  "purchasing flow doc",
);

requireIncludes(
  repository,
  [
    "createCanonicalPurchaseOrder",
    "ensureCanonicalPurchaseForLegacyOrder",
    "ensureCanonicalPurchaseLines",
    "inv_purchases",
    "inv_purchase_lines",
    "inv_stock_lots",
    "purchase_receipt",
    "updateItemCostBasis",
  ],
  "purchasing repository",
);

requireIncludes(
  types,
  ["approval_status", "approved_at", "cancelled_at", "stock_lot_id"],
  "purchasing types",
);

requireIncludes(
  migration,
  [
    "legacy_purchase_order_id",
    "legacy_purchase_order_item_id",
    "purchase_receipt",
    "inv_purchases_status_known",
    "inv_purchase_lines_receipt_quantities_nonnegative",
    "create or replace view public.cost_purchase_receipts_v",
    "security_invoker",
  ],
  "purchasing migration",
);

requireIncludes(
  roadmap,
  [
    "Finish purchase orders and purchase lines.",
    "Connect suppliers to items and costs.",
    "Add received quantities and lot creation.",
    "Add purchasing status and approval flow.",
    "05.05 Purchasing And Supplier Flow",
    "docs/purchasing-supplier-flow.md",
  ],
  "roadmap phase 05.05",
);

if (roadmap.includes("- [ ] Finish purchase orders and purchase lines.")) {
  throw new Error("roadmap phase 05.05 still has unchecked tasks");
}

requireIncludes(
  checklist,
  ["[x] Purchasing receipts update inventory and cost basis."],
  "launch checklist",
);

process.stdout.write("OK purchasing supplier flow contract\n");
