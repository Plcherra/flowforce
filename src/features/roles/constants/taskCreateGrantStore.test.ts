import "@/i18n/config";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskCreateScopeSection } from "@/features/employees/components/users/TaskCreateScopeSection";
import { applyTaskCreateGrant } from "./taskCreateGrantStore";
import type { TaskCreateGrant } from "./taskCreateScope";

const baseConfig = { access: { managerCanInviteManagers: true } };

export function runTaskCreateGrantStoreTests() {
  const ownerGrant = applyTaskCreateGrant({
    config: baseConfig,
    actorId: "pedro",
    isOwner: true,
    action: "grant",
    grant: {
      id: "marcus-grant",
      granteeId: "marcus",
      canGrant: true,
      levels: [],
      userIds: [],
      revoked: false,
    },
  });
  assert.equal(ownerGrant.ok, true);
  if (!ownerGrant.ok) return;
  assert.equal(ownerGrant.config.access && (ownerGrant.config.access as { managerCanInviteManagers: boolean }).managerCanInviteManagers, true);

  const marcusGrant = applyTaskCreateGrant({
    config: ownerGrant.config,
    actorId: "marcus",
    isOwner: false,
    action: "grant",
    grant: {
      id: "john-grant",
      granteeId: "john",
      canGrant: false,
      levels: [3, 4],
      userIds: [],
      revoked: false,
    },
  });
  assert.equal(marcusGrant.ok, true);
  if (!marcusGrant.ok) return;

  const passed = applyTaskCreateGrant({
    config: ownerGrant.config,
    actorId: "marcus",
    isOwner: false,
    action: "grant",
    grant: {
      id: "too-far",
      granteeId: "john",
      canGrant: true,
      levels: [],
      userIds: [],
      revoked: false,
    },
  });
  assert.deepEqual(passed, { ok: false, reason: "cannot-pass-grant" });

  const stranger = applyTaskCreateGrant({
    config: ownerGrant.config,
    actorId: "ana",
    isOwner: false,
    action: "grant",
    grant: {
      id: "nope",
      granteeId: "john",
      canGrant: false,
      levels: [4],
      userIds: [],
      revoked: false,
    },
  });
  assert.deepEqual(stranger, { ok: false, reason: "forbidden" });

  const revoked = applyTaskCreateGrant({
    config: marcusGrant.config,
    actorId: "marcus",
    isOwner: false,
    action: "revoke",
    grantId: "john-grant",
  });
  assert.equal(revoked.ok, true);
  if (!revoked.ok) return;
  const john = revoked.grants.find((grant) => grant.id === "john-grant");
  const marcus = revoked.grants.find((grant) => grant.id === "marcus-grant");
  assert.equal(john?.revoked, true);
  assert.equal(marcus?.revoked, false);
  assert.equal(marcus?.canGrant, true);

  const html = renderToStaticMarkup(
    createElement(TaskCreateScopeSection, {
      level: 3,
      grants: [
        {
          id: "john-grant",
          granteeId: "john",
          canGrant: false,
          levels: [3, 4],
          userIds: [],
          revoked: false,
        } satisfies TaskCreateGrant,
      ],
      canEdit: true,
      canPassGrant: false,
      people: [{ id: "ada", name: "Ada" }],
      selectedLevels: [3],
      selectedUsers: [],
      passGrant: false,
      onToggleLevel: () => undefined,
      onToggleUser: () => undefined,
      onPassGrant: () => undefined,
      onSave: () => undefined,
      onRevoke: () => undefined,
    }),
  );
  assert.match(html, /task-create-scope/);
  assert.match(html, /task-create-revoke-john-grant/);
  assert.equal(html.includes("task-create-pass-grant"), false);
}
