/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import {
  orderFormFields,
  type OrderableFormField,
} from "../utils/orderFormFields";

describe("orderFormFields", () => {
  it("sorts fields by numeric order while keeping fallback insertion order", () => {
    const fields: Array<OrderableFormField & { label: string }> = [
      { id: "field-2", field_order: 2, label: "Second" },
      { id: "field-3", field_order: null, label: "No Order" },
      { id: "field-1", field_order: 1, label: "First" },
      { id: "field-4", field_order: null, label: "Another unordered" },
    ];

    const ordered = orderFormFields(fields);

    expect(ordered.map((field) => field.id)).toEqual([
      "field-1",
      "field-2",
      "field-3",
      "field-4",
    ]);
  });

  it("handles negative and zero orders and treats NaN as unordered", () => {
    const fields: Array<OrderableFormField> = [
      { id: "field-a", field_order: 0 },
      { id: "field-b", field_order: -3 },
      { id: "field-c", field_order: Number.NaN },
      { id: "field-d", field_order: 5 },
    ];

    const ordered = orderFormFields(fields);

    expect(ordered.map((field) => field.id)).toEqual([
      "field-b",
      "field-a",
      "field-d",
      "field-c",
    ]);
  });
});
