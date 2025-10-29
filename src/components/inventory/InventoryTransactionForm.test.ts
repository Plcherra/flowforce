import { describe, expect, it } from 'vitest';

import { computeInventoryTransactionTotals } from './InventoryTransactionForm';

describe('computeInventoryTransactionTotals', () => {
  it('applies conversion factor when deriving totals', () => {
    const { normalizedQuantity, totalAmount } = computeInventoryTransactionTotals(2, 4, 1.5);

    expect(normalizedQuantity).toBe(8);
    expect(totalAmount).toBeCloseTo(12);
  });

  it('returns undefined total when unit price is not provided', () => {
    const { normalizedQuantity, totalAmount } = computeInventoryTransactionTotals(5, 3);

    expect(normalizedQuantity).toBe(15);
    expect(totalAmount).toBeUndefined();
  });
});
