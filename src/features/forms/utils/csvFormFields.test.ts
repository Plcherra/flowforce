import assert from "node:assert/strict";
import { fieldsFromCsv } from "./csvFormFields";

export function runCsvFormFieldsTests() {
  const labels = fieldsFromCsv('Name,"Clean, downstairs",Notes\nAda,Mop,Done\n');
  assert.deepEqual(labels, ["Name", "Clean, downstairs", "Notes"]);
  assert.deepEqual(fieldsFromCsv("   \n"), []);
}
