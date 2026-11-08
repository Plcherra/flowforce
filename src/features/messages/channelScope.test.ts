import assert from "node:assert/strict";

import {
  channelIsVisible,
  chatIsUnread,
  directChatTitle,
  messageRecipientIds,
  withParticipantNames,
  type DirectoryChannel,
} from "./channelScope";

const company = "107fbeaa-91c0-4f2d-ae17-8620d5e7afd1";
const pedro = "8d27003a-d24f-4d7a-a48f-3d67f86eaf7c";
const lightning = "25521a6e-faae-4b03-ad8f-b18ad315866d";

function directChannel(): DirectoryChannel {
  return {
    id: "06ef2b8d-fee7-4adc-b5f3-eaa9ef0b58bc",
    company_id: company,
    name: "Lightning H",
    type: "direct",
    created_by: pedro,
    latest_message_at: "2026-11-08T14:36:04.861Z",
    channel_members: [
      { user_id: pedro, role: "admin", last_read_at: "2026-11-08T14:35:58.136Z" },
      { user_id: lightning, role: "member", last_read_at: null },
    ],
  };
}

export function runChannelScopeTests() {
  const named = withParticipantNames([directChannel()], [
    { id: pedro, first_name: "Pedro", last_name: "Lopes" },
    { id: lightning, first_name: "Lightning", last_name: "H" },
  ])[0];

  assert.equal(channelIsVisible(named, lightning, company), true);
  assert.equal(channelIsVisible(named, pedro, company), true);
  assert.equal(
    channelIsVisible(named, "someone-else", company),
    false,
  );
  assert.equal(
    channelIsVisible(named, lightning, "other-company"),
    false,
  );
  assert.equal(
    channelIsVisible({ ...named, company_id: null }, lightning, company),
    true,
  );

  assert.equal(directChatTitle(named, lightning, "Teammate"), "Pedro Lopes");
  assert.equal(directChatTitle(named, pedro, "Teammate"), "Lightning H");
  assert.equal(
    directChatTitle(
      { ...directChannel(), type: "group", name: "Closing crew" },
      lightning,
      "Teammate",
    ),
    "Closing crew",
  );

  assert.equal(chatIsUnread(named, lightning, null), true);
  assert.equal(chatIsUnread(named, lightning, named.id), false);
  assert.equal(chatIsUnread(named, pedro, null), true);

  assert.deepEqual(messageRecipientIds(named.channel_members ?? [], pedro), [
    lightning,
  ]);
  assert.deepEqual(
    messageRecipientIds(named.channel_members ?? [], lightning),
    [pedro],
  );
}
