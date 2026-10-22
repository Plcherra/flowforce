import assert from "node:assert/strict";

import {
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
} from "@/server/i18n/translateContent";
import { TRANSLATABLE_FIELDS } from "@/server/i18n/translatableFields";

import {
  EXPENSE_TABLE,
  HELPDESK_TABLE,
  OPS_ISSUE_TABLE,
  VENDOR_VISIT_TABLE,
  expenseTextFields,
  helpdeskTextFields,
  opsIssueTextFields,
  resolveWrittenText,
  vendorVisitTextFields,
} from "./remainingWrittenText";

const vendorName = "North Dock Seafood";
const amount = "128.40";
const receiptUrl = "https://receipts.example/file.pdf";
const vendorDescription = "Drop the fish at the side door before lunch.";
const expenseDescription = "New gloves for the dish pit";
const expenseNotes = "The old box split during the Saturday rush.";
const helpdeskSubject = "Walk-in door will not seal";
const helpdeskDescription = "The gasket is torn on the hinge side.";
const issueTitle = "Task compliance slipping";
const issueDescription = "The close checklist is landing after the last table.";

function fieldCache() {
  const store = new Map<string, ContentTranslationRow[]>();
  const keyFor = (input: { sourceTable: string; sourceId: string; fieldPath: string }) =>
    `${input.sourceTable}:${input.sourceId}:${input.fieldPath}`;
  const cache: ContentTranslationCache = {
    async read(input) {
      return store.get(keyFor(input)) ?? [];
    },
    async replace(input) {
      store.set(
        keyFor(input),
        input.rows.map((row) => ({
          locale: row.locale,
          sourceHash: input.sourceHash,
          translatedText: row.translatedText,
        })),
      );
    },
  };
  return { cache };
}

export async function runRemainingWrittenTextTests() {
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.helpdesk_tickets ?? {}).sort(), [
    "description",
    "subject",
  ]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.ops_issues ?? {}).sort(), [
    "description",
    "title",
  ]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.expenses ?? {}).sort(), [
    "description",
    "notes",
  ]);
  assert.deepEqual(Object.keys(TRANSLATABLE_FIELDS.vendor_visits ?? {}), ["description"]);
  const vendorFields = vendorVisitTextFields({
    description: vendorDescription,
    vendorName,
    amount,
    receiptUrl,
  });
  const expenseFields = expenseTextFields({
    description: expenseDescription,
    notes: expenseNotes,
    amount,
    receiptUrl,
  });
  assert.deepEqual(
    vendorFields.map((field) => field.text),
    [vendorDescription],
  );
  assert.equal(expenseFields.some((field) => field.text.includes(amount)), false);
  assert.equal(expenseFields.some((field) => field.text.includes(receiptUrl)), false);
  assert.equal(vendorFields.some((field) => field.text.includes(vendorName)), false);
  const paths = [
    ...helpdeskTextFields({ subject: helpdeskSubject, description: helpdeskDescription }).map(
      (field) => ({ table: HELPDESK_TABLE, id: "ticket-1", ...field }),
    ),
    ...opsIssueTextFields({ title: issueTitle, description: issueDescription }).map((field) => ({
      table: OPS_ISSUE_TABLE,
      id: "issue-1",
      ...field,
    })),
    ...expenseFields.map((field) => ({ table: EXPENSE_TABLE, id: "expense-1", ...field })),
    ...vendorFields.map((field) => ({ table: VENDOR_VISIT_TABLE, id: "visit-1", ...field })),
  ];
  assert.deepEqual(
    paths.map((field) => `${field.table}.${field.fieldPath}`),
    [
      "helpdesk_tickets.subject",
      "helpdesk_tickets.description",
      "ops_issues.title",
      "ops_issues.description",
      "expenses.description",
      "expenses.notes",
      "vendor_visits.description",
    ],
  );
  const stored = fieldCache();
  let calls = 0;
  const seen: string[] = [];
  for (const field of paths) {
    const result = await translateContent({
      companyId: "company-1",
      sourceTable: field.table,
      sourceId: field.id,
      fieldPath: field.fieldPath,
      text: field.text,
      sourceLocale: "en",
      viewerLocale: "es",
      cache: stored.cache,
      model: {
        async translate({ text, targetLocale }: { text: string; targetLocale: string }) {
          calls += 1;
          seen.push(text);
          return { text: `${targetLocale}:${text}` };
        },
      },
      budget: { async allowed() { return true; } },
    });
    assert.equal(result.text, `es:${field.text}`);
  }
  assert.equal(calls, 35);
  assert.equal(seen.some((text) => text.includes(vendorName)), false);
  assert.equal(seen.some((text) => text.includes(amount)), false);
  assert.equal(seen.some((text) => text.includes(receiptUrl)), false);
  const again = await translateContent({
    companyId: "company-1",
    sourceTable: VENDOR_VISIT_TABLE,
    sourceId: "visit-1",
    fieldPath: "description",
    text: vendorDescription,
    sourceLocale: "en",
    viewerLocale: "es",
    cache: stored.cache,
    model: {
      async translate() {
        calls += 1;
        return { text: "should-not-run" };
      },
    },
    budget: { async allowed() { return true; } },
  });
  assert.equal(again.text, `es:${vendorDescription}`);
  assert.equal(calls, 35);
  const resolved = await resolveWrittenText(
    {
      id: "visit-1",
      fields: vendorFields,
    },
    [
      {
        sourceId: "visit-1",
        fieldPath: "description",
        locale: "es",
        sourceLocale: "en",
        sourceHash: again.sourceHash,
        translatedText: `es:${vendorDescription}`,
      },
    ],
    "es",
  );
  assert.equal(resolved.values.description, `es:${vendorDescription}`);
  const author = await resolveWrittenText(
    { id: "visit-1", fields: vendorFields },
    [
      {
        sourceId: "visit-1",
        fieldPath: "description",
        locale: "es",
        sourceLocale: "en",
        sourceHash: again.sourceHash,
        translatedText: `es:${vendorDescription}`,
      },
    ],
    "en",
  );
  assert.deepEqual(author.values, {});
}
