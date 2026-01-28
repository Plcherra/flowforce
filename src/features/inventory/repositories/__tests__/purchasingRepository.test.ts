import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  type CreatePurchaseOrderInput,
  type ReceivePurchaseOrderInput,
} from "../purchasingRepository";

const defaultUser = { id: "user-1" };

function createMockSupabaseClient(
  responses: Record<string, Array<{ data: any; error: any }>>,
): SupabaseClient & {
  from: ReturnType<typeof vi.fn>;
  auth: { getUser: ReturnType<typeof vi.fn> };
  operations: Record<string, any[]>;
} {
  const operations: Record<string, any[]> = {};
  const client = {
    from: vi.fn((table: string) => {
      if (!operations[table]) operations[table] = [];
      return buildQueryBuilder(
        table,
        responses[table] ?? [],
        operations[table],
      );
    }),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: defaultUser } })),
    },
    operations,
  } as unknown as SupabaseClient & {
    from: ReturnType<typeof vi.fn>;
    auth: { getUser: ReturnType<typeof vi.fn> };
    operations: Record<string, any[]>;
  };
  return client;
}

function buildQueryBuilder(
  table: string,
  queue: Array<{ data: any; error: any }>,
  ops: any[],
) {
  const builder: any = {
    insert: vi.fn((payload: unknown) => {
      ops.push({ type: "insert", table, payload });
      return builder;
    }),
    update: vi.fn((payload: unknown) => {
      ops.push({ type: "update", table, payload });
      return builder;
    }),
    delete: vi.fn((payload?: unknown) => {
      ops.push({ type: "delete", table, payload });
      return builder;
    }),
    select: vi.fn(() => builder),
    eq: vi.fn((field: string, value: unknown) => {
      ops.push({ type: "eq", table, field, value });
      return builder;
    }),
    order: vi.fn((field: string, config?: unknown) => {
      ops.push({ type: "order", table, field, config });
      return builder;
    }),
    in: vi.fn(() => builder),
    upsert: vi.fn((payload: unknown) => {
      ops.push({ type: "upsert", table, payload });
      return builder;
    }),
    single: vi.fn(() =>
      Promise.resolve(queue.shift() ?? { data: null, error: null }),
    ),
    maybeSingle: vi.fn(() =>
      Promise.resolve(queue.shift() ?? { data: null, error: null }),
    ),
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve(queue.shift() ?? { data: null, error: null }).then(
        resolve,
      ),
  };
  return builder;
}

describe("purchasingRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists purchase orders", async () => {
    const mockClient = createMockSupabaseClient({
      purchase_orders: [
        {
          data: [
            {
              id: "po-1",
              po_number: "PO-1",
              status: "pending",
              purchase_order_items: [],
            },
          ],
          error: null,
        },
      ],
    });

    const orders = await listPurchaseOrders({ supabaseClient: mockClient });
    expect(orders).toHaveLength(1);
    expect(mockClient.from).toHaveBeenCalledWith("purchase_orders");
  });

  it("creates a purchase order with items", async () => {
    const responses = {
      purchase_orders: [
        { data: { id: "po-1" }, error: null },
        {
          data: {
            id: "po-1",
            po_number: "PO-123",
            status: "pending",
            purchase_order_items: [],
          },
          error: null,
        },
      ],
      purchase_order_items: [{ data: null, error: null }],
    } satisfies Record<string, Array<{ data: any; error: any }>>;

    const mockClient = createMockSupabaseClient(responses);

    const payload: CreatePurchaseOrderInput = {
      supplier: {
        id: "sup-1",
        name: "ACME",
        contact_name: "Alex",
        email: "a@acme.com",
        phone: "555-0100",
        address: null,
        payment_terms: "NET30",
        integration: null,
      },
      items: [
        {
          item_id: "item-1",
          item_name: "Flour",
          quantity: 2,
          unit_price: 5,
        },
      ],
    };

    const order = await createPurchaseOrder(payload, {
      supabaseClient: mockClient,
    });
    expect(order?.id).toBe("po-1");
    expect(
      mockClient.operations.purchase_order_items.some(
        (op) => op.type === "insert",
      ),
    ).toBe(true);
  });

  it("receives a purchase order and records transactions", async () => {
    const responses = {
      purchase_orders: [
        {
          data: {
            id: "po-1",
            po_number: "PO-1",
            status: "pending",
            currency: "USD",
            purchase_order_items: [
              {
                id: "line-1",
                item_id: "item-1",
                quantity: 5,
                unit_price: 10,
                received_quantity: 0,
              },
            ],
          },
          error: null,
        },
        {
          data: {
            id: "po-1",
            po_number: "PO-1",
            status: "pending",
            currency: "USD",
            purchase_order_items: [
              {
                id: "line-1",
                item_id: "item-1",
                quantity: 5,
                unit_price: 10,
                received_quantity: 3,
              },
            ],
          },
          error: null,
        },
        { data: { id: "po-1" }, error: null },
        {
          data: {
            id: "po-1",
            po_number: "PO-1",
            status: "received",
            currency: "USD",
            purchase_order_items: [
              {
                id: "line-1",
                item_id: "item-1",
                quantity: 5,
                unit_price: 10,
                received_quantity: 3,
              },
            ],
          },
          error: null,
        },
      ],
      purchase_order_items: [{ data: { id: "line-1" }, error: null }],
      inventory_transactions: [{ data: null, error: null }],
    } satisfies Record<string, Array<{ data: any; error: any }>>;

    const mockClient = createMockSupabaseClient(responses);

    const payload: ReceivePurchaseOrderInput = {
      items: [
        {
          id: "line-1",
          received_quantity: 3,
        },
      ],
      closeOrder: true,
    };

    const updated = await receivePurchaseOrder("po-1", payload, {
      supabaseClient: mockClient,
    });
    expect(updated?.status).toBe("received");
    expect(mockClient.operations.inventory_transactions[0]?.type).toBe(
      "insert",
    );
  });
});
