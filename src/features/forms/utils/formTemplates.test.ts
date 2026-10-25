import assert from "node:assert/strict";
import { formTemplates } from "./formTemplates";

export function runFormTemplateTests() {
  assert.ok(formTemplates.length >= 6);
  for (const template of formTemplates) {
    assert.ok(
      template.fields.length >= 3,
      `${template.id} should include more than one field`,
    );
    const labels = template.fields.map((item) => item.label);
    assert.equal(new Set(labels).size, labels.length, `${template.id} labels repeat`);
  }

  const registration = formTemplates.find((template) => template.id === "event-registration");
  assert.ok(registration);
  assert.deepEqual(
    registration.fields.map((item) => item.label),
    ["Full name", "Email", "Event", "Number of guests", "Dietary notes", "Attending"],
  );
}
