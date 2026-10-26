import assert from "node:assert/strict";
import { evaluateArithmeticFormula, formulaAnswerMap } from "./formulaValue";

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
}
