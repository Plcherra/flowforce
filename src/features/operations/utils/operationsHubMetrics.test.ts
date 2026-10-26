import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "@/i18n/config";
import { KpiCard } from "../components/KpiCard";
import { OperationsSignalsCard } from "../components/OperationsSignalsCard";
import {
  buildOperationsHub,
  type OperationsHubSource,
} from "./operationsHubMetrics";
import { buildOperationsSuggestion } from "./operationsHubSuggestion";

const now = new Date("2026-10-26T15:00:00.000Z");

const emptySource = (): OperationsHubSource => ({
  tasks: [],
  items: [],
  schedules: [],
  sales: [],
  laborEntries: [],
  counts: [],
  waste: [],
});

export async function runOperationsHubMetricTests() {
  await i18n.changeLanguage("en");
  const empty = buildOperationsHub(emptySource(), now);
  assert.equal(empty.tasks.available, false);
  assert.equal(empty.tasks.percent, null);
  assert.equal(empty.tasks.emptyReason, "no_tasks");
  assert.equal(empty.inventory.percent, null);
  assert.equal(empty.inventory.emptyReason, "no_minimums");
  assert.equal(empty.labor.percent, null);
  assert.equal(empty.labor.emptyReason, "no_sales");
  assert.equal(empty.countsDue.count, 0);
  assert.deepEqual(empty.lowStock, []);
  assert.equal(empty.waste.kind, "empty");
  assert.equal(empty.windows.today, "2026-10-26");
  assert.equal(empty.windows.currentStart, "2026-10-20");
  assert.equal(empty.windows.previousStart, "2026-10-13");

  const tasks = buildOperationsHub(
    {
      ...emptySource(),
      tasks: [
        { status: "open", due_date: "2026-10-21", completed_at: "2026-10-21T18:00:00Z" },
        { status: "open", due_date: "2026-10-22", completed_at: "2026-10-23T18:00:00Z" },
        { status: "cancelled", due_date: "2026-10-23", completed_at: null },
        { status: "open", due_date: "2026-10-24", completed_at: null },
        { status: "done", due_date: "2026-10-25", completed_at: null },
        { status: "done", due_date: "2026-10-16", completed_at: "2026-10-16T12:00:00Z" },
      ],
    },
    now,
  );
  assert.equal(tasks.tasks.percent, 50);
  assert.equal(tasks.tasks.severity, "critical");
  assert.equal(tasks.tasks.trendPoints, -50);

  const inventory = buildOperationsHub(
    {
      ...emptySource(),
      items: [
        {
          id: "yeast",
          name: "Yeast",
          unit_quantity: 8,
          min_stock_level: 10,
          is_active: true,
          location_name: "Bar",
        },
        {
          id: "flour",
          name: "Flour",
          unit_quantity: 10,
          min_stock_level: 10,
          is_active: true,
          location_name: null,
        },
        {
          id: "oil",
          name: "Oil",
          unit_quantity: 11,
          min_stock_level: 10,
          is_active: true,
          location_name: "Dry",
        },
        {
          id: "salt",
          name: "Salt",
          unit_quantity: 0,
          min_stock_level: 0,
          is_active: true,
          location_name: null,
        },
        {
          id: "retired",
          name: "Retired",
          unit_quantity: 0,
          min_stock_level: 5,
          is_active: false,
          location_name: null,
        },
      ],
    },
    now,
  );
  assert.equal(inventory.inventory.percent, 33.3);
  assert.equal(inventory.inventory.severity, "critical");
  assert.equal(inventory.inventory.trendPoints, null);
  assert.deepEqual(
    inventory.lowStock.map((item) => item.id),
    ["yeast", "flour"],
  );
  assert.equal(inventory.lowStock[0].percentOfMinimum, 80);

  const labor = buildOperationsHub(
    {
      ...emptySource(),
      sales: [
        { transaction_type: "sale", total_amount: 1000, created_at: "2026-10-22T12:00:00Z" },
        { transaction_type: "sale", total_amount: 500, created_at: "2026-10-15T12:00:00Z" },
        { transaction_type: "adjustment", total_amount: 9999, created_at: "2026-10-22T12:00:00Z" },
      ],
      schedules: [
        {
          start_time: "2026-10-22T09:00:00Z",
          end_time: "2026-10-22T17:00:00Z",
          break_minutes: 0,
          hourly_rate: 20,
          required_headcount: 1,
          user_id: "ana",
          requirements: null,
          is_template: false,
          status: "published",
        },
        {
          start_time: "2026-10-15T09:00:00Z",
          end_time: "2026-10-15T17:00:00Z",
          break_minutes: 0,
          hourly_rate: 25,
          required_headcount: 1,
          user_id: "ana",
          requirements: null,
          is_template: false,
          status: "published",
        },
        {
          start_time: "2026-10-22T09:00:00Z",
          end_time: "2026-10-22T17:00:00Z",
          break_minutes: 0,
          hourly_rate: 99,
          required_headcount: 1,
          user_id: "ana",
          requirements: null,
          is_template: true,
          status: "published",
        },
      ],
    },
    now,
  );
  assert.equal(labor.labor.percent, 16);
  assert.equal(labor.labor.laborBasis, "schedule");
  assert.equal(labor.labor.severity, "normal");
  assert.equal(labor.labor.trendPoints, -24);

  const missingRate = buildOperationsHub(
    {
      ...emptySource(),
      sales: [
        { transaction_type: "sale", total_amount: 100, created_at: "2026-10-22T12:00:00Z" },
      ],
      schedules: [
        {
          start_time: "2026-10-22T09:00:00Z",
          end_time: "2026-10-22T17:00:00Z",
          break_minutes: 0,
          hourly_rate: null,
          required_headcount: 1,
          user_id: "ana",
          requirements: null,
          is_template: false,
          status: "published",
        },
      ],
    },
    now,
  );
  assert.equal(missingRate.labor.available, false);
  assert.equal(missingRate.labor.emptyReason, "no_labor_rate");

  const recorded = buildOperationsHub(
    {
      ...emptySource(),
      sales: [
        { transaction_type: "sale", total_amount: 100, created_at: "2026-10-22T12:00:00Z" },
      ],
      schedules: [
        {
          start_time: "2026-10-22T09:00:00Z",
          end_time: "2026-10-22T17:00:00Z",
          break_minutes: 0,
          hourly_rate: null,
          required_headcount: 1,
          user_id: "ana",
          requirements: null,
          is_template: false,
          status: "published",
        },
      ],
      laborEntries: [{ labor_cost: 25, work_date: "2026-10-22" }],
    },
    now,
  );
  assert.equal(recorded.labor.percent, 25);
  assert.equal(recorded.labor.laborBasis, "recorded");

  const noShifts = buildOperationsHub(
    {
      ...emptySource(),
      sales: [
        { transaction_type: "Sale", total_amount: 200, created_at: "2026-10-22T12:00:00Z" },
      ],
    },
    now,
  );
  assert.equal(noShifts.labor.percent, 0);
  assert.equal(noShifts.labor.laborBasis, "schedule");

  const signals = buildOperationsHub(
    {
      ...emptySource(),
      counts: [
        { count_date: "2026-10-26", status: "open", location_name: "North" },
        { count_date: "2026-10-25", status: "draft", location_name: "North" },
        { count_date: "2026-10-27", status: "open", location_name: "South" },
        { count_date: "2026-10-26", status: "completed", location_name: "Bar" },
        { count_date: null, status: "open", location_name: "Loose" },
      ],
      waste: [
        { cost_impact: 100, waste_date: "2026-10-14" },
        { cost_impact: 80, waste_date: "2026-10-22" },
      ],
    },
    now,
  );
  assert.equal(signals.countsDue.count, 2);
  assert.deepEqual(signals.countsDue.locations, ["North"]);
  assert.equal(signals.waste.kind, "trend");
  assert.equal(signals.waste.percentChange, -20);

  const freshWaste = buildOperationsHub(
    {
      ...emptySource(),
      waste: [{ cost_impact: 40, waste_date: "2026-10-22" }],
    },
    now,
  );
  assert.equal(freshWaste.waste.kind, "amount");
  assert.equal(freshWaste.waste.cost, 40);
  assert.equal(freshWaste.waste.percentChange, null);

  const suggestion = buildOperationsSuggestion({
    kpiKey: "tasks_compliance",
    title: "Raise on-time task completion",
    summary: "50% of tasks due in the last 7 days were completed on time.",
    valueLabel: "50%",
  });
  assert.equal(suggestion.status, "pending");
  assert.equal(suggestion.script.steps.length, 3);
  assert.equal(suggestion.script.steps[1].type, "create_task");
  assert.match(suggestion.suggestion_summary, /50%/);

  const banned = ["92%", "78%", "31.4%", "3 shifts", "12 items", "Cold brew", "Ciabatta"];
  const files = [
    "src/features/operations/components/KpiCard.tsx",
    "src/features/operations/components/OperationsHub.tsx",
    "src/features/operations/components/OperationsSignalsCard.tsx",
    "src/features/operations/utils/operationsHubMetrics.ts",
    "src/features/operations/hooks/useOperationsHubMetrics.ts",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const sample of banned) {
      assert.equal(source.includes(sample), false, `${file} still contains ${sample}`);
    }
  }

  const markup = renderToStaticMarkup(
    createElement(KpiCard, {
      kpiKey: "tasks_compliance",
      loading: false,
      failed: false,
      result: empty.tasks,
      saving: false,
      onSuggest: async () => undefined,
    }),
  );
  assert.match(markup, /No tasks were due in the last 7 days/);
  assert.equal(markup.includes("92%"), false);
  assert.equal(markup.includes("Fix automatically"), false);

  const readyMarkup = renderToStaticMarkup(
    createElement(KpiCard, {
      kpiKey: "labor_vs_sales",
      loading: false,
      failed: false,
      result: labor.labor,
      saving: false,
      onSuggest: async () => undefined,
    }),
  );
  assert.match(readyMarkup, /16%/);
  assert.match(readyMarkup, /Fix automatically/);
  assert.equal(readyMarkup.includes("31.4%"), false);

  const signalMarkup = renderToStaticMarkup(
    createElement(OperationsSignalsCard, {
      loading: false,
      currency: "GBP",
      countsFailed: false,
      stockFailed: false,
      wasteFailed: false,
      model: inventory,
    }),
  );
  assert.match(signalMarkup, /2 items/);
  assert.match(signalMarkup, /Yeast/);
  assert.equal(signalMarkup.includes("12 items"), false);
  assert.equal(signalMarkup.includes("3 shifts"), false);
  assert.equal(signalMarkup.includes("Cold brew"), false);
}
