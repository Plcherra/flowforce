import assert from "node:assert/strict";
import { emptyTaskAudience } from "@/features/tasks/utils/taskAudience";
import {
  canFillForm,
  canSeeFormSubmissions,
  defaultFormDistribution,
  distributionProblem,
  formListedForViewer,
  readFormDistribution,
  withFormDistribution,
  type FormAccessViewer,
  type FormDistribution,
} from "./formDistribution";

const NOW = new Date("2026-11-06T15:00:00.000Z");

function viewer(overrides: Partial<FormAccessViewer> = {}): FormAccessViewer {
  return {
    userId: "ada",
    roleId: "role-barista",
    roleName: "Barista",
    positionIds: ["pos-bar"],
    departmentId: "dept-floor",
    canManage: false,
    canSubmit: true,
    canReadSubmissions: false,
    roles: [
      { id: "role-barista", name: "Barista" },
      { id: "role-lead", name: "Shift lead" },
    ],
    ...overrides,
  };
}

function distribution(overrides: Partial<FormDistribution> = {}): FormDistribution {
  return { ...defaultFormDistribution(), ...overrides };
}

export function runFormDistributionTests() {
  const stored = withFormDistribution(
    { contentSourceLocale: "en", checklist: { area: "cashier", slot: "opening" } },
    distribution({
      recordKind: "list",
      roleIds: ["role-barista"],
      fillAudience: { ...emptyTaskAudience("people"), userIds: ["ada"] },
      seeAudience: { ...emptyTaskAudience("role"), roleIds: ["role-lead"] },
      showFrom: "2026-11-06T12:00:00.000Z",
      dueAt: "2026-11-06T18:00:00.000Z",
    }),
  );
  assert.equal(stored.contentSourceLocale, "en");
  assert.deepEqual(stored.checklist, { area: "cashier", slot: "opening" });
  const read = readFormDistribution(stored);
  assert.equal(read.recordKind, "list");
  assert.deepEqual(read.roleIds, ["role-barista"]);
  assert.deepEqual(read.fillAudience.userIds, ["ada"]);
  assert.equal(read.seeAudience.kind, "role");
  assert.equal(read.showFrom, "2026-11-06T12:00:00.000Z");
  assert.equal(read.dueAt, "2026-11-06T18:00:00.000Z");

  assert.equal(readFormDistribution(null).recordKind, "form");
  assert.equal(readFormDistribution({ distribution: { fill_audience: { kind: "private" } } }).fillAudience.kind, "company");
  assert.equal(
    distributionProblem(distribution({
      showFrom: "2026-11-06T18:00:00.000Z",
      dueAt: "2026-11-06T12:00:00.000Z",
    })),
    "due",
  );
  assert.equal(
    distributionProblem(distribution({
      fillAudience: emptyTaskAudience("people"),
    })),
    "fill",
  );

  const openForm = {
    status: "published",
    created_by: "manager",
    settings: withFormDistribution(null, distribution()),
  };
  assert.equal(canFillForm(openForm, viewer(), NOW), true);
  assert.equal(canFillForm(openForm, viewer({ canSubmit: false }), NOW), false);

  const scheduled = {
    status: "published",
    created_by: "manager",
    settings: withFormDistribution(null, distribution({
      showFrom: "2026-11-06T16:00:00.000Z",
      dueAt: "2026-11-06T18:00:00.000Z",
    })),
  };
  assert.equal(canFillForm(scheduled, viewer(), NOW), false);
  assert.equal(canFillForm(scheduled, viewer(), new Date("2026-11-06T16:30:00.000Z")), true);
  assert.equal(canFillForm(scheduled, viewer(), new Date("2026-11-06T18:00:00.000Z")), false);
  assert.equal(formListedForViewer(scheduled, viewer(), new Date("2026-11-06T18:00:00.000Z")), false);

  const roleList = {
    status: "published",
    created_by: "manager",
    settings: withFormDistribution(null, distribution({
      recordKind: "list",
      roleIds: ["role-barista"],
    })),
  };
  assert.equal(canFillForm(roleList, viewer(), NOW), true);
  assert.equal(canFillForm(roleList, viewer({ roleId: "role-lead", roleName: "Shift lead" }), NOW), false);
  assert.equal(
    canFillForm(roleList, viewer({ roleId: null, roleName: "Barista" }), NOW),
    true,
  );
  assert.equal(
    canFillForm(roleList, viewer({ userId: "lead", roleId: "role-lead", roleName: "Shift lead" }), NOW),
    false,
  );
  const creator = {
    status: "published",
    created_by: "ada",
    settings: withFormDistribution(null, distribution({
      recordKind: "list",
      roleIds: ["role-barista"],
      dueAt: "2026-11-06T18:00:00.000Z",
    })),
  };
  assert.equal(canFillForm(creator, viewer({ roleId: "role-lead", roleName: "Shift lead" }), NOW), true);
  assert.equal(
    canFillForm(creator, viewer(), new Date("2026-11-06T19:00:00.000Z")),
    false,
  );

  const peopleOnly = {
    status: "published",
    created_by: "manager",
    settings: withFormDistribution(null, distribution({
      fillAudience: { ...emptyTaskAudience("people"), userIds: ["ben"] },
      seeAudience: { ...emptyTaskAudience("people"), userIds: ["cara"] },
    })),
  };
  assert.equal(canFillForm(peopleOnly, viewer(), NOW), false);
  assert.equal(canFillForm(peopleOnly, viewer({ userId: "ben" }), NOW), true);
  assert.equal(canSeeFormSubmissions(peopleOnly, viewer({ userId: "cara" })), true);
  assert.equal(canSeeFormSubmissions(peopleOnly, viewer()), false);
  assert.equal(canSeeFormSubmissions(openForm, viewer()), false);
  assert.equal(canSeeFormSubmissions(openForm, viewer({ canReadSubmissions: true })), true);
  assert.equal(canSeeFormSubmissions(peopleOnly, viewer({ canManage: true })), true);
  assert.equal(
    canSeeFormSubmissions(peopleOnly, viewer({ canManage: true }), { hideOthers: true }),
    false,
  );
  assert.equal(canFillForm(peopleOnly, viewer({ canManage: true }), new Date("2026-11-06T19:00:00.000Z")), false);
  assert.equal(
    formListedForViewer(peopleOnly, viewer({ canManage: true }), new Date("2026-11-06T19:00:00.000Z")),
    true,
  );

  const draft = { status: "draft", created_by: "manager", settings: openForm.settings };
  assert.equal(formListedForViewer(draft, viewer(), NOW), false);
  assert.equal(formListedForViewer(draft, viewer({ canManage: true }), NOW), true);
}
