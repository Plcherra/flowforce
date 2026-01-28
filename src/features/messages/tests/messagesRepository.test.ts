import { describe, it, expect, beforeEach, vi } from "vitest";
import { messagesRepository } from "@/repositories/messagesRepository";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

const mockFrom = supabase.from as unknown as ReturnType<typeof vi.fn> & {
  mockReturnValue: any;
  mockImplementation: any;
  mockReset: any;
};

function createBuilder() {
  const builder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  return builder;
}

describe("messagesRepository", () => {
  beforeEach(() => {
    mockFrom.mockReset?.();
  });

  it("listChannels parses and returns channels", async () => {
    const rawChannel = {
      id: "channel-1",
      name: "General",
      description: "Discuss",
      type: "group",
      created_by: "user-1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      department_id: null,
      is_private: false,
      channel_members: [
        { user_id: "user-1", role: "admin", last_read_at: null },
      ],
      created_profile: { first_name: "John", last_name: "Doe" },
      department: null,
    };

    const builder = createBuilder();
    builder.order.mockResolvedValue({ data: [rawChannel], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await messagesRepository.listChannels("user-1");
    expect(mockFrom).toHaveBeenCalledWith("message_channels");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("General");
  });

  it("insertMessage returns normalized message", async () => {
    const ensureBuilder = createBuilder();
    ensureBuilder.maybeSingle.mockResolvedValue({
      data: { channel_id: "channel-1" },
      error: null,
    });

    const insertBuilder = createBuilder();
    insertBuilder.single.mockResolvedValue({
      data: {
        id: "msg-1",
        channel_id: "channel-1",
        sender_id: "user-1",
        content: "Hello",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        reply_to_id: null,
        message_type: "text",
        attachments: null,
        sender_profile: {
          first_name: "John",
          last_name: "Doe",
          avatar_url: null,
        },
        reply_to_message: null,
      },
      error: null,
    });

    mockFrom
      .mockImplementationOnce(() => ensureBuilder)
      .mockImplementationOnce(() => insertBuilder);

    const message = await messagesRepository.insertMessage(
      "channel-1",
      "user-1",
      "Hello",
    );
    expect(message.id).toBe("msg-1");
    expect(message.attachments).toEqual([]);
  });

  it("deleteChannel removes messages, members, and channel", async () => {
    const ensureBuilder = createBuilder();
    ensureBuilder.maybeSingle.mockResolvedValue({
      data: { channel_id: "channel-1" },
      error: null,
    });

    const messagesDeleteBuilder = createBuilder();
    messagesDeleteBuilder.eq.mockResolvedValue({ error: null });

    const membersDeleteBuilder = createBuilder();
    membersDeleteBuilder.eq.mockResolvedValue({ error: null });

    const channelDeleteBuilder = createBuilder();
    channelDeleteBuilder.eq.mockResolvedValue({ error: null });

    mockFrom
      .mockImplementationOnce(() => ensureBuilder)
      .mockImplementationOnce(() => messagesDeleteBuilder)
      .mockImplementationOnce(() => membersDeleteBuilder)
      .mockImplementationOnce(() => channelDeleteBuilder);

    await expect(
      messagesRepository.deleteChannel("channel-1", "user-1"),
    ).resolves.not.toThrow();
    expect(mockFrom).toHaveBeenCalledTimes(4);
    expect(mockFrom).toHaveBeenNthCalledWith(2, "messages");
    expect(mockFrom).toHaveBeenNthCalledWith(3, "channel_members");
    expect(mockFrom).toHaveBeenNthCalledWith(4, "message_channels");
  });
});
