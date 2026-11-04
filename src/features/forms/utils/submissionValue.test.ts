import assert from "node:assert/strict";
import { submissionCsvCell, submissionDisplayText } from "./submissionValue";

const labels = { yes: "Yes", no: "No", uploaded: "File uploaded" };

export function runSubmissionValueTests() {
  assert.equal(submissionCsvCell("file_upload", null, labels), "");
  assert.equal(submissionCsvCell("file_upload", [], labels), "");
  assert.equal(submissionCsvCell("signature", undefined, labels), "");
  assert.equal(
    submissionCsvCell(
      "file_upload",
      [{ filename: "cooler.jpg", path: "forms/cooler.jpg" }],
      labels,
    ),
    "cooler.jpg",
  );
  assert.equal(
    submissionCsvCell(
      "image_upload",
      [{ name: "shelf.png", path: "forms/shelf.png" }],
      labels,
    ),
    "shelf.png",
  );
  assert.equal(
    submissionCsvCell("file", [{ size: 12, type: "image/png" }], labels),
    "File uploaded",
  );
  assert.equal(submissionCsvCell("yes_no", true, labels), "Yes");
  assert.equal(submissionCsvCell("text", "Ready", labels), "Ready");
  assert.equal(
    submissionDisplayText({ signer_name: "Ada", signature_path: "forms/sign.png" }),
    "Ada",
  );
}
