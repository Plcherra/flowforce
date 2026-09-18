const listeners = new Set<() => void>();
let timeoutMinutes: number | null = null;

export function getIdleSessionTimeout() {
  return timeoutMinutes;
}

export function subscribeIdleSessionTimeout(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setIdleSessionTimeout(minutes: number | null) {
  timeoutMinutes = minutes;
  listeners.forEach((listener) => listener());
}

export function parseIdleSessionTimeout(value: unknown, fallback = 30) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }
  return fallback;
}
