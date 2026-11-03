import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { actorCanRunAutomation } from "./automationAccess";
import {
  AUTOMATION_INSERT_ALLOWLIST,
  planAutomationScript,
} from "./automationScriptPlan";
import { runStoredAutomation } from "./runStoredAutomation";
import { buildOperationsSuggestion } from "@/features/operations/utils/operationsHubSuggestion";
import { normalizeOpsViewRow } from "@/features/operations/utils/opsViewRow";

type Row = Record<string, any>;

function memoryAdmin(state: Record<string, Row[]>, failTables: string[] = []) {
  return {
    from(table: string) {
      if (!state[table]) state[table] = [];
      const filters: Array<(row: Row) => boolean> = [];
      let action: "select" | "update" | "insert" | "delete" = "select";
      let patch: Row = {};
      let inserted: Row[] = [];
      const rows = () => state[table];
      const matched = () => rows().filter((row) => filters.every((filter) => filter(row)));
      const builder: any = {
        select() {
          return builder;
        },
        update(next: Row) {
          action = "update";
          patch = next;
          return builder;
        },
        insert(next: Row | Row[]) {
          action = "insert";
          if (failTables.includes(table)) {
            inserted = [];
            return builder;
          }
          inserted = (Array.isArray(next) ? next : [next]).map((row) => ({
            id: randomUUID(),
            ...row,
          }));
          state[table].push(...inserted);
          return builder;
        },
        delete() {
          action = "delete";
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return builder;
        },
        is(column: string, value: unknown) {
          filters.push((row) => (row[column] ?? null) === value);
          return builder;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle() {
          return builder.exec(true);
        },
        single() {
          return builder.exec(false);
        },
        then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(builder.exec(true)).then(resolve, reject);
        },
        exec(allowEmpty: boolean) {
          if (action === "insert" && failTables.includes(table)) {
            return { data: null, error: { code: "PGRST205", message: "schema cache" } };
          }
          if (action === "insert") {
            const data = inserted.length === 1 ? inserted[0] : inserted;
            return { data, error: null };
          }
          if (action === "update") {
            const hits = matched();
            for (const row of hits) Object.assign(row, patch);
            const data = hits[0] ? { ...hits[0] } : null;
            return {
              data,
              error: data || allowEmpty ? null : { message: "missing" },
            };
          }
          if (action === "delete") {
            const hits = new Set(matched());
            state[table] = rows().filter((row) => !hits.has(row));
            return { data: null, error: null };
          }
          const hits = matched();
          return { data: hits[0] ?? null, error: null };
        },
      };
      return builder;
    },
  };
}

function suggestionScript() {
  return buildOperationsSuggestion({
    kpiKey: "tasks_compliance",
    title: "Raise on-time task completion",
    summary: "50% of tasks were on time.",
    valueLabel: "50%",
  }).script;
}

export async function runAutomationRunnerTests() {
  assert.equal(actorCanRunAutomation({
    productLevel: "manager",
    permissions: { editTasks: true, "ai.actions.approve": true },
    overrides: [],
  }), false);
  assert.equal(actorCanRunAutomation({
    productLevel: "admin",
    permissions: { "ai.actions.automate": true },
    overrides: [],
  }), true);
  assert.equal(actorCanRunAutomation({
    productLevel: "owner",
    permissions: {},
    overrides: [],
  }), true);
  assert.equal(actorCanRunAutomation({
    productLevel: "owner",
    permissions: { "ai.actions.automate": false },
    overrides: [],
  }), false);
  assert.equal(actorCanRunAutomation({
    productLevel: "staff",
    permissions: {},
    overrides: [{ permission_key: "ai.actions.automate", permission_value: "allow" }],
  }), true);
  assert.equal(actorCanRunAutomation({
    productLevel: "admin",
    permissions: { "ai.actions.automate": true },
    overrides: [{ permission_key: "ai.actions.automate", permission_value: "deny" }],
  }), false);

  assert.deepEqual(AUTOMATION_INSERT_ALLOWLIST, {});
  const kpi = planAutomationScript(suggestionScript());
  assert.equal(kpi.ok, true);
  if (kpi.ok) {
    assert.deepEqual(
      kpi.effects.map((effect) => effect.kind),
      ["context", "create_task", "notify"],
    );
  }
  assert.equal(planAutomationScript({
    version: "1.0",
    meta: { name: "Read profiles" },
    steps: [{ key: "q", type: "query", resource: "profiles" }],
  }).ok, false);
  assert.equal(planAutomationScript({
    version: "1.0",
    meta: { name: "Email" },
    steps: [{ key: "n", type: "notify", channel: "email", message: "hi" }],
  }).ok, false);
  assert.equal(planAutomationScript({
    version: "1.0",
    meta: { name: "Branch" },
    steps: [{ key: "b", type: "branch", condition: "true", then: [], else: [] }],
  }).ok, false);
  const blockedInsert = planAutomationScript({
    version: "1.0",
    meta: { name: "Insert" },
    steps: [{ key: "d", type: "db_insert", target: "tasks", values: { title: "x" } }],
  });
  assert.equal(blockedInsert.ok, false);
  if (!blockedInsert.ok) assert.equal(blockedInsert.error, "insert_not_allowlisted");

  const allowed = planAutomationScript(
    {
      version: "1.0",
      meta: { name: "Note" },
      steps: [{
        key: "d",
        type: "db_insert",
        target: "ops_notes",
        values: { body: "hello", company_id: "evil", nested: { no: true } },
      }],
    },
    { ops_notes: ["body", "company_id", "nested"] },
  );
  assert.equal(allowed.ok, false);

  const scalarInsert = planAutomationScript(
    {
      version: "1.0",
      meta: { name: "Note" },
      steps: [{
        key: "d",
        type: "db_insert",
        target: "ops_notes",
        values: { body: "hello", company_id: "evil" },
      }],
    },
    { ops_notes: ["body", "company_id"] },
  );
  assert.equal(scalarInsert.ok, true);
  if (scalarInsert.ok && scalarInsert.effects[0]?.kind === "db_insert") {
    assert.deepEqual(scalarInsert.effects[0].values, { body: "hello" });
  }

  const companyId = "company-a";
  const state: Record<string, Row[]> = {
    ops_automation_suggestions: [{
      id: "suggestion-1",
      company_id: companyId,
      status: "pending",
      script: suggestionScript(),
      suggestion_title: "Raise on-time task completion",
    }, {
      id: "suggestion-other",
      company_id: "company-b",
      status: "pending",
      script: suggestionScript(),
      suggestion_title: "Other",
    }],
  };
  const admin = memoryAdmin(state);
  const ran = await runStoredAutomation(admin, {
    suggestionId: "suggestion-1",
    companyId,
    actorId: "user-1",
  });
  assert.equal(ran.code, "ran");
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].company_id, companyId);
  assert.equal(state.tasks[0].created_by, "user-1");
  assert.equal(state.tasks[0].assigned_to, undefined);
  assert.equal(state.task_notifications.length, 1);
  assert.equal(state.task_notifications[0].user_id, "user-1");
  assert.equal(state.ops_automation_suggestions[0].status, "active");
  assert.equal(state.ops_automation_runs[0].status, "succeeded");
  assert.equal(state.ops_automation_run_steps.length, 3);

  const again = await runStoredAutomation(admin, {
    suggestionId: "suggestion-1",
    companyId,
    actorId: "user-1",
  });
  assert.equal(again.code, "already_active");
  assert.equal(state.tasks.length, 1);

  const foreign = await runStoredAutomation(admin, {
    suggestionId: "suggestion-other",
    companyId,
    actorId: "user-1",
  });
  assert.equal(foreign.code, "not_found");
  assert.equal(state.ops_automation_suggestions[1].status, "pending");

  state.ops_automation_suggestions.push({
    id: "suggestion-insert",
    company_id: companyId,
    status: "pending",
    script: {
      version: "1.0",
      meta: { name: "Insert tasks" },
      steps: [{ key: "d", type: "db_insert", target: "tasks", values: { title: "nope" } }],
    },
    suggestion_title: "Insert tasks",
  });
  const rejected = await runStoredAutomation(admin, {
    suggestionId: "suggestion-insert",
    companyId,
    actorId: "user-1",
  });
  assert.equal(rejected.code, "unsupported");
  assert.equal(state.tasks.length, 1);
  assert.equal(
    state.ops_automation_suggestions.find((row) => row.id === "suggestion-insert")?.status,
    "pending",
  );

  const broken = memoryAdmin(
    {
      ops_automation_suggestions: [{
        id: "suggestion-log",
        company_id: companyId,
        status: "pending",
        script: suggestionScript(),
        suggestion_title: "Log",
      }],
    },
    ["ops_automation_runs"],
  );
  const unavailable = await runStoredAutomation(broken, {
    suggestionId: "suggestion-log",
    companyId,
    actorId: "user-1",
  });
  assert.equal(unavailable.code, "storage_unavailable");

  const adapter = readFileSync(
    "src/server/automation/adapters/flowforceOperationsAdapter.ts",
    "utf8",
  );
  assert.equal(adapter.includes("fetch("), false);
  assert.equal(adapter.includes("FLOWFORCE_AUTOMATIONS_ENDPOINT"), false);
  const panel = readFileSync(
    "src/features/operations/components/AutomationsPanel.tsx",
    "utf8",
  );
  assert.match(panel, /\/api\/ops\/automations\/run/);
  assert.equal(panel.includes("dispatchAutomationToFlowForce"), false);
  const route = readFileSync("app/api/ops/automations/run/route.ts", "utf8");
  assert.match(route, /getBearerToken/);
  assert.match(route, /supabaseAdmin\.auth\.getUser/);
  assert.equal(route.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.equal(route.includes("suggestion.script"), false);

  const issue = normalizeOpsViewRow<{ issueid: string; workflow_instanceid: string }>({
    issue_id: "issue-1",
    workflow_instance_id: "run-1",
    issueid: null,
  });
  assert.equal(issue.issueid, "issue-1");
  assert.equal(issue.workflow_instanceid, "run-1");
}
