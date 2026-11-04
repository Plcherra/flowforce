import assert from "node:assert/strict";
import {
  evaluateArithmeticFormula,
  formulaAnswerMap,
  formulaDisplay,
  shouldEmitFormulaValue,
} from "./formulaValue";

export function runFormulaValueTests() {
  const answers = formulaAnswerMap(
    [
      { id: "temp", label: "Temperature" },
      { id: "count", label: "On-hand count" },
    ],
    { temp: "4", count: 2 },
  );
  assert.equal(evaluateArithmeticFormula("{Temperature} * 1.8 + 32", answers), 39.2);
  assert.equal(evaluateArithmeticFormula("{On-hand count} * 3", answers), 6);
  assert.equal(evaluateArithmeticFormula("{Temperature}; alert(1)", answers), null);
  assert.equal(evaluateArithmeticFormula("", answers), null);

  const labeled = formulaAnswerMap(
    [{ id: "temp", label: "Temperature (C)" }],
    { temp: "4" },
  );
  assert.equal(evaluateArithmeticFormula("{Temperature (C)} + 1", labeled), 5);
  assert.deepEqual(formulaDisplay("{Temperature (C)} + 1", labeled), {
    value: 5,
    invalid: false,
  });
  assert.deepEqual(formulaDisplay("{Temperature (C)} + 1", { "Temperature (C)": "" }), {
    value: null,
    invalid: false,
  });
  assert.deepEqual(formulaDisplay("1++", labeled), { value: null, invalid: true });
  assert.equal(shouldEmitFormulaValue(undefined, null), true);
  assert.equal(shouldEmitFormulaValue(null, null), false);
  assert.equal(shouldEmitFormulaValue(5, 5), false);
  assert.equal(shouldEmitFormulaValue(5, 6), true);
}
