import assert from "node:assert/strict";
import { fieldLabelsFromImport, fieldsFromPlainText } from "./importFormFields";

export function runImportFormFieldTests() {
  assert.deepEqual(
    fieldLabelsFromImport("stations.csv", 'Name,"Clean, downstairs",Notes\nA,B,C'),
    ["Name", "Clean, downstairs", "Notes"],
  );
  assert.deepEqual(
    fieldsFromPlainText("Opening manager\nStations ready\nManager signoff\n"),
    ["Opening manager", "Stations ready", "Manager signoff"],
  );
  assert.deepEqual(fieldLabelsFromImport("policy.pdf", "PK\u0003\u0004 binary"), []);
  assert.deepEqual(fieldLabelsFromImport("scan.pdf", "%PDF-1.7\n\x00\x01"), []);
  const uncompressedPdf = [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "trailer",
    "<< /Root 1 0 R >>",
    "%%EOF",
  ].join("\n");
  assert.deepEqual(fieldLabelsFromImport("menu.pdf", uncompressedPdf), []);
  assert.deepEqual(fieldLabelsFromImport("menu.PDF", uncompressedPdf), []);
  assert.deepEqual(fieldLabelsFromImport("notes.txt", uncompressedPdf), []);
  assert.deepEqual(
    fieldLabelsFromImport("handbook.docx", "Opening checklist\nStations ready\n"),
    [],
  );
  assert.deepEqual(
    fieldLabelsFromImport("checklist.txt", "Walk-in cooler\nHot well\n"),
    ["Walk-in cooler", "Hot well"],
  );
}
