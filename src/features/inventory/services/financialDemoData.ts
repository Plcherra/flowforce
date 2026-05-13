import { supabase } from "@/integrations/supabase/client";
import { formatISO, subMonths } from "date-fns";

type DemoSeedResult = {
  paymentsInserted: number;
  expensesInserted: number;
  transactionsInserted: number;
  skippedTransactions?: string;
  alreadySeeded?: boolean;
};

const SAMPLE_PREFIX = "Demo Financial";

const asDateOnly = (date: Date) => formatISO(date, { representation: "date" });

export async function generateFinancialDemoData(): Promise<DemoSeedResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("You must be signed in to generate demo financial data.");
  }

  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(new Date(), index),
  );

  let paymentsInserted = 0;
  let expensesInserted = 0;
  let transactionsInserted = 0;
  let skippedTransactions: string | undefined;

  const paymentsCheck = await supabase
    .from("payments")
    .select("id")
    .ilike("description", `${SAMPLE_PREFIX}%`)
    .limit(1);

  if (paymentsCheck.error) {
    throw paymentsCheck.error;
  }

  const alreadySeeded = (paymentsCheck.data?.length ?? 0) > 0;

  if (!alreadySeeded) {
    const paymentRows = months.map((date, index) => {
      const status = index <= 3 ? "paid" : "approved";
      const amount = 1150 + index * 85;
      return {
        payment_type:
          index % 3 === 0
            ? "wage"
            : index % 3 === 1
              ? "bonus"
              : "expense_reimbursement",
        recipient_type: "employee",
        recipient_id: user.id,
        recipient_name: "Demo Employee",
        amount,
        currency: "USD",
        payment_method: "bank_transfer",
        reference_number: `DEMO-PAY-${index}-${date.getFullYear()}`,
        description: `${SAMPLE_PREFIX} Payroll ${date.toLocaleString("default", { month: "short", year: "numeric" })}`,
        status,
        due_date: asDateOnly(date),
        paid_date: status === "paid" ? asDateOnly(date) : null,
        approved_by: user.id,
        approved_at: formatISO(date),
        created_by: user.id,
        created_at: formatISO(date),
        notes: "Seeded via demo generator",
        attachments: [],
      };
    });

    const paymentInsert = await supabase.from("payments").insert(paymentRows);
    if (paymentInsert.error) {
      throw paymentInsert.error;
    }
    paymentsInserted = paymentRows.length;
  }

  const expensesCheck = await supabase
    .from("expenses")
    .select("id")
    .ilike("description", `${SAMPLE_PREFIX}%`)
    .limit(1);

  if (expensesCheck.error) {
    throw expensesCheck.error;
  }

  if (expensesCheck.data?.length === 0) {
    const categories = [
      "utilities",
      "supplies",
      "travel",
      "software",
      "equipment",
      "other",
    ] as const;
    const expenseRows = months.map((date, index) => {
      const category = categories[index % categories.length];
      const status = index <= 2 ? "approved" : index === 3 ? "paid" : "pending";
      const amount = 240 + index * 45;
      return {
        category,
        description: `${SAMPLE_PREFIX} ${category} ${date.toLocaleString("default", { month: "short", year: "numeric" })}`,
        amount,
        currency: "USD",
        expense_date: asDateOnly(date),
        status,
        employee_id: user.id,
        created_by: user.id,
        created_at: formatISO(date),
        notes: "Seeded via demo generator",
      };
    });

    const expenseInsert = await supabase.from("expenses").insert(expenseRows);
    if (expenseInsert.error) {
      throw expenseInsert.error;
    }
    expensesInserted = expenseRows.length;
  }

  const transactionCheck = await supabase
    .from("inventory_transactions")
    .select("id")
    .ilike("reference_number", "DEMO-FIN-%")
    .limit(1);

  if (transactionCheck.error) {
    throw transactionCheck.error;
  }

  if (transactionCheck.data?.length === 0) {
    let itemId: string | null = null;
    const existingItem = await supabase
      .from("inventory_items")
      .select("id")
      .eq("name", "Demo Coffee Beans")
      .maybeSingle();

    if (existingItem.error) {
      throw existingItem.error;
    }

    if (existingItem.data?.id) {
      itemId = existingItem.data.id;
    } else {
      const insertedItem = await supabase
        .from("inventory_items")
        .insert({
          name: "Demo Coffee Beans",
          description: "Sample inventory item for analytics demo seeding",
          created_by: user.id,
          unit_price: 6.75,
          currency: "USD",
          current_stock: 200,
          unit: "bag",
          status: "active",
        })
        .select("id")
        .single();

      if (insertedItem.error) {
        skippedTransactions =
          "Unable to create demo inventory item due to permissions.";
      } else {
        itemId = insertedItem.data.id;
      }
    }

    if (itemId) {
      const baseSaleQty = 90;
      const basePurchaseQty = 40;
      const salePrice = 7.9;
      const purchasePrice = 4.3;

      const transactionRows = months.flatMap((date, index) => {
        const saleQuantity = baseSaleQty + index * 6;
        const purchaseQuantity = basePurchaseQty + index * 3;

        return [
          {
            item_id: itemId!,
            transaction_type: "sale",
            quantity: saleQuantity,
            unit_price: salePrice,
            total_amount: saleQuantity * salePrice,
            reference_number: `DEMO-FIN-SALE-${index}-${date.getFullYear()}`,
            notes: "Seeded sale transaction for analytics demo",
            performed_by: user.id,
            created_at: formatISO(date),
          },
          {
            item_id: itemId!,
            transaction_type: "purchase",
            quantity: purchaseQuantity,
            unit_price: purchasePrice,
            total_amount: purchaseQuantity * purchasePrice,
            reference_number: `DEMO-FIN-PURCHASE-${index}-${date.getFullYear()}`,
            notes: "Seeded purchase transaction for analytics demo",
            performed_by: user.id,
            created_at: formatISO(date),
          },
        ];
      });

      const transactionInsert = await supabase
        .from("inventory_transactions")
        .insert(transactionRows);
      if (transactionInsert.error) {
        throw transactionInsert.error;
      }
      transactionsInserted = transactionRows.length;
    }
  } else {
    skippedTransactions = "Demo inventory transactions already present.";
  }

  return {
    paymentsInserted,
    expensesInserted,
    transactionsInserted,
    skippedTransactions,
    alreadySeeded,
  };
}
