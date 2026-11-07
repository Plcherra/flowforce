export const STORE_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type StoreDay = (typeof STORE_DAYS)[number];

export type DayHours = {
  closed: boolean;
  open: string;
  close: string;
};

export type StoreHours = Record<StoreDay, DayHours>;

export type StoreDraft = {
  key: string;
  name: string;
  address: string;
  hours: StoreHours;
};

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function shouldAskForStore(storeCount: number): boolean {
  return storeCount > 1;
}

export function defaultDayHours(): DayHours {
  return { closed: false, open: "08:00", close: "22:00" };
}

export function defaultStoreHours(): StoreHours {
  const hours = {} as StoreHours;
  for (const day of STORE_DAYS) hours[day] = defaultDayHours();
  return hours;
}

function newKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `store-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function blankStore(): StoreDraft {
  return {
    key: newKey(),
    name: "",
    address: "",
    hours: defaultStoreHours(),
  };
}

export function primaryWindow(store: StoreDraft): { opens: string; closes: string } {
  const openDay = STORE_DAYS.map((day) => store.hours[day]).find((day) => !day.closed);
  return {
    opens: openDay?.open ?? "08:00",
    closes: openDay?.close ?? "22:00",
  };
}

function dayProblem(day: DayHours): boolean {
  if (day.closed) return false;
  if (!CLOCK.test(day.open) || !CLOCK.test(day.close)) return true;
  return day.open === day.close;
}

export function storeDraftProblem(store: StoreDraft): boolean {
  if (!store.name.trim()) return true;
  if (STORE_DAYS.every((day) => store.hours[day]?.closed)) return true;
  return STORE_DAYS.some((day) => dayProblem(store.hours[day]));
}

export function namedStores(stores: StoreDraft[]): StoreDraft[] {
  return stores.filter((store) => store.name.trim().length > 0);
}

export function storesProblem(stores: StoreDraft[]): "store" | null {
  const named = namedStores(stores);
  if (named.length === 0) return "store";
  if (named.some((store) => storeDraftProblem(store))) return "store";
  return null;
}

export function hoursFromWindow(opens: string, closes: string): StoreHours {
  const hours = defaultStoreHours();
  for (const day of STORE_DAYS) {
    hours[day] = { closed: false, open: opens, close: closes };
  }
  return hours;
}
