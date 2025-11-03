export interface OrderableFormField {
  id: string;
  field_order: number | null;
}

const normalizeOrder = (value: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;

export function orderFormFields<T extends OrderableFormField>(fields: T[]): T[] {
  return fields
    .map((field, index) => ({ field, index }))
    .sort((a, b) => {
      const orderDifference = normalizeOrder(a.field.field_order) - normalizeOrder(b.field.field_order);
      if (orderDifference !== 0) {
        return orderDifference;
      }
      return a.index - b.index;
    })
    .map(({ field }) => field);
}

