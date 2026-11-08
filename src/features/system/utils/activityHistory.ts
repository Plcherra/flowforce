export type ActivityDetail = {
  field: string;
  before?: unknown;
  after?: unknown;
  pack?: string;
  store?: string;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

const LANGUAGE_CODES = ["en", "es", "pt", "fr", "it", "de"] as const;
const PACK_IDS = ["team", "insights", "stock"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPackFlags(root: Record<string, unknown>) {
  const admin = isRecord(root.admin_config)
    ? root.admin_config
    : isRecord(root.adminConfig)
      ? root.adminConfig
      : null;
  const flags = admin && isRecord(admin.packFlags) ? admin.packFlags : null;
  return flags;
}

function readLocations(root: Record<string, unknown>) {
  const admin = isRecord(root.admin_config)
    ? root.admin_config
    : isRecord(root.adminConfig)
      ? root.adminConfig
      : null;
  const structure = admin && isRecord(admin.businessStructure) ? admin.businessStructure : null;
  const locations = structure?.locations;
  return Array.isArray(locations) ? locations.filter(isRecord) : [];
}

function locationHours(location: Record<string, unknown>) {
  if ("hours" in location) return location.hours;
  if ("workingHours" in location) return location.workingHours;
  return undefined;
}

export function settingsChangeDetails(
  oldValues: unknown,
  newValues: unknown,
): ActivityDetail[] {
  const before = isRecord(oldValues) ? oldValues : {};
  const after = isRecord(newValues) ? newValues : {};
  const details: ActivityDetail[] = [];

  const oldLanguage = isRecord(before.localization) ? before.localization.language : undefined;
  const newLanguage = isRecord(after.localization) ? after.localization.language : undefined;
  if (typeof newLanguage === "string" && newLanguage !== oldLanguage) {
    details.push({ field: "language", before: oldLanguage ?? null, after: newLanguage });
  }

  const oldName = isRecord(before.general) ? before.general.companyName : undefined;
  const newName = isRecord(after.general) ? after.general.companyName : undefined;
  if (typeof newName === "string" && newName !== oldName) {
    details.push({ field: "companyName", before: oldName ?? null, after: newName });
  }

  const oldPacks = readPackFlags(before);
  const newPacks = readPackFlags(after);
  if (oldPacks && newPacks) {
    for (const pack of PACK_IDS) {
      if (oldPacks[pack] !== newPacks[pack] && typeof newPacks[pack] === "boolean") {
        details.push({
          field: "pack",
          pack,
          before: Boolean(oldPacks[pack]),
          after: newPacks[pack],
        });
      }
    }
  }

  const oldLocations = readLocations(before);
  const newLocations = readLocations(after);
  for (const next of newLocations) {
    const name = typeof next.name === "string" ? next.name : "";
    if (!name || locationHours(next) === undefined) continue;
    const previous = oldLocations.find((item) => item.name === name);
    const previousHours = previous ? locationHours(previous) : undefined;
    if (JSON.stringify(previousHours) !== JSON.stringify(locationHours(next))) {
      details.push({ field: "storeHours", store: name });
    }
  }

  return details;
}

function languageName(t: Translate, code: unknown) {
  const value = typeof code === "string" ? code : "";
  if ((LANGUAGE_CODES as readonly string[]).includes(value)) {
    return t(`settings.languageName.${value}`);
  }
  return value || t("literals.unknown");
}

function packName(t: Translate, pack: string | undefined) {
  if (pack === "team" || pack === "insights" || pack === "stock") {
    return t(`packs.${pack}.title`);
  }
  return pack ?? "";
}

function detailSentence(t: Translate, detail: ActivityDetail): string | null {
  if (detail.field === "language") {
    return t("settings.activityChangedLanguage", {
      from: languageName(t, detail.before),
      to: languageName(t, detail.after),
    });
  }
  if (detail.field === "companyName" && typeof detail.after === "string") {
    return t("settings.activityRenamedCompany", { name: detail.after });
  }
  if (detail.field === "pack") {
    const turnedOn = detail.after === true;
    return t(turnedOn ? "settings.activityTurnedOnPack" : "settings.activityTurnedOffPack", {
      pack: packName(t, detail.pack),
    });
  }
  if (detail.field === "storeHours" && detail.store) {
    return t("settings.activityChangedStoreHours", { store: detail.store });
  }
  return null;
}

export function humanizeAuditAction(action: string) {
  const words = action.replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return action;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function readDetails(metadata: Record<string, unknown> | null | undefined): ActivityDetail[] {
  const raw = metadata?.details;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((item) => ({
    field: typeof item.field === "string" ? item.field : "",
    before: item.before,
    after: item.after,
    pack: typeof item.pack === "string" ? item.pack : undefined,
    store: typeof item.store === "string" ? item.store : undefined,
  }));
}

export function describeActivity(
  t: Translate,
  entry: {
    action?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): string {
  const action = entry.action ?? "";
  const metadata = entry.metadata ?? null;
  const details = readDetails(metadata);
  if (
    details.length === 0 &&
    typeof metadata?.pack === "string" &&
    typeof metadata.packEnabled === "boolean"
  ) {
    details.push({
      field: "pack",
      pack: metadata.pack,
      after: metadata.packEnabled,
    });
  }

  const sentences = details
    .map((detail) => detailSentence(t, detail))
    .filter((sentence): sentence is string => Boolean(sentence));
  if (sentences.length > 0) return sentences.join(" ");
  if (action === "system_settings.updated") return t("settings.activityChangedSettings");
  return humanizeAuditAction(action);
}

export function activityActorName(
  profile: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined,
  fallback: string,
) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (profile?.email) return profile.email;
  return fallback;
}

export function formatActivityTime(value: string, timeZone: string | null | undefined) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  if (timeZone) options.timeZone = timeZone;
  try {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }
}
