import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createInventoryTransfer,
  listInventoryTransfers,
  updateInventoryTransferStatus,
} from "../transfersRepository";
import {
  notifyTransferCreated,
  notifyTransferStatusChange,
} from "@/notifications/inventoryTransfers";
import type { InventoryTransferStatus } from "@/features/inventory/hooks/types";

vi.mock("@/notifications/inventoryTransfers", () => ({
  notifyTransferCreated: vi.fn(),
  notifyTransferStatusChange: vi.fn(),
}));

const mockedNotifyTransferCreated =
  notifyTransferCreated as unknown as ReturnType<typeof vi.fn>;
const mockedNotifyTransferStatusChange =
  notifyTransferStatusChange as unknown as ReturnType<typeof vi.fn>;

describe("transfersRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists transfers for a company", async () => {
    const mockClient = createMockSupabase({
      inv_transfers: [{ data: [{ id: "t1", company_id: "c1" }], error: null }],
    });

    const transfers = await listInventoryTransfers("c1", {
      supabaseClient: mockClient,
    });
    expect(transfers).toHaveLength(1);
    expect(mockClient.from).toHaveBeenCalledWith("inv_transfers");
  });

  it("creates a transfer and triggers notification", async () => {
    const responses = {
      profiles: [{ data: { company_id: "company-1" }, error: null }],
      inv_transfers: [
        { data: { id: "transfer-1" }, error: null },
        {
          data: {
            id: "transfer-1",
            company_id: "company-1",
            requested_by: "user-1",
            fulfiller_id: "user-2",
            recipient_id: "user-3",
            from_location_id: "loc-1",
            to_location_id: "loc-2",
            from_location: { name: "Kitchen" },
            to_location: { name: "Bar" },
            items: [],
            audit: [],
            delivery_date: "2024-01-01",
          },
          error: null,
        },
      ],
      inv_transfer_items: [{ data: null, error: null }],
      inv_transfer_audit: [{ data: null, error: null }],
    } satisfies Record<string, Array<{ data: unknown; error: unknown }>>;

    const mockClient = createMockSupabase(responses);

    const transfer = await createInventoryTransfer(
      {
        company_id: "company-1",
        requested_by: "user-1",
        fulfiller_id: "user-2",
        recipient_id: "user-3",
        from_location_id: "loc-1",
        to_location_id: "loc-2",
        items: [
          {
            item_id: "item-1",
            unit_id: "unit-1",
            quantity: 2,
            cost_per_unit: 10,
          },
        ],
      },
      { supabaseClient: mockClient },
    );

    expect(transfer?.id).toBe("transfer-1");
    expect(mockedNotifyTransferCreated).toHaveBeenCalledWith(
      expect.objectContaining({ transferId: "transfer-1" }),
    );
  });

  it("updates transfer status and logs audit", async () => {
    const responses = {
      inv_transfers: [
        {
          data: {
            id: "transfer-1",
            company_id: "company-1",
            status: "requested",
            requested_by: "user-1",
            fulfiller_id: "user-2",
            recipient_id: "user-3",
            from_location: { name: "Kitchen" },
            to_location: { name: "Bar" },
            delivery_date: null,
          },
          error: null,
        },
        { data: null, error: null },
        {
          data: {
            id: "transfer-1",
            company_id: "company-1",
            status: "sent",
            requested_by: "user-1",
            fulfiller_id: "user-2",
            recipient_id: "user-3",
            from_location: { name: "Kitchen" },
            to_location: { name: "Bar" },
            delivery_date: null,
          },
          error: null,
        },
      ],
      profiles: [{ data: { company_id: "company-1" }, error: null }],
      inv_transfer_audit: [{ data: null, error: null }],
    } satisfies Record<string, Array<{ data: unknown; error: unknown }>>;

    const mockClient = createMockSupabase(responses);

    const status: InventoryTransferStatus = "sent";
    const updated = await updateInventoryTransferStatus(
      "transfer-1",
      { actor_id: "user-1", status },
      { supabaseClient: mockClient },
    );

    expect(updated?.status).toBe("sent");
    expect(mockedNotifyTransferStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ transferId: "transfer-1", status }),
    );
  });
});

function createMockSupabase(
  responses: Record<string, Array<{ data: unknown; error: unknown }>>,
) {
  const client = {
    from: vi.fn((table: string) => buildQueryBuilder(table, responses)),
  } as unknown as SupabaseClient & { from: ReturnType<typeof vi.fn> };
  return client;
}

function buildQueryBuilder(
  table: string,
  responses: Record<string, Array<{ data: unknown; error: unknown }>>,
) {
  const queue = responses[table] ?? [];
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    in: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    then: (resolve: (value: any) => void) => {
      const result = queue.shift() ?? { data: null, error: null };
      return resolve(result);
    },
  };
  return builder;
}
