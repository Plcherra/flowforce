export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const asBooleanRecord = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<Record<string, boolean>>((acc, [key, entryValue]) => {
    acc[key] = entryValue === true;
    return acc;
  }, {});
};
