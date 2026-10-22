import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  REMINDER_CONTENT_TABLE,
  reminderContentTranslationFields,
  resolveReminderContentTranslation,
  type ReminderContentTranslation,
  type StoredReminderTranslation,
} from "../reminderContentFields";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface ReminderContentSource {
  id?: string;
  title?: string | null;
  description?: string | null;
  updated_at?: string | null;
}

export function useReminderContentTranslations(reminders: ReminderContentSource[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => reminders.map((reminder) => reminder.id).filter((id): id is string => Boolean(id)),
    [reminders],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, ReminderContentTranslation | null>>(
    new Map(),
  );
  const retries = useRef(0);

  const query = useQuery({
    queryKey: ["content-translations", REMINDER_CONTENT_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", REMINDER_CONTENT_TABLE)
        .in("source_id", ids);
      if (error) throw error;
      return (data ?? []) as Array<{
        source_id: string;
        field_path: string;
        locale: string;
        source_locale: string;
        source_hash: string;
        translated_text: string;
      }>;
    },
  });

  const translationQueryReady = query.isSuccess;
  const refetchTranslations = query.refetch;
  const rows = useMemo<StoredReminderTranslation[]>(
    () =>
      (query.data ?? []).map((row) => ({
        sourceId: row.source_id,
        fieldPath: row.field_path,
        locale: row.locale,
        sourceLocale: row.source_locale,
        sourceHash: row.source_hash,
        translatedText: row.translated_text,
      })),
    [query.data],
  );

  useEffect(() => {
    if (!companyId || reminders.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, ReminderContentTranslation | null>();
      for (const reminder of reminders) {
        if (!reminder.id) continue;
        const source = {
          id: reminder.id,
          title: reminder.title ?? "",
          description: reminder.description,
        };
        const result = await resolveReminderContentTranslation(source, rows, viewerLocale);
        next.set(reminder.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${reminder.id}:${viewerLocale}:${reminder.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: REMINDER_CONTENT_TABLE,
          sourceId: reminder.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: reminderContentTranslationFields(source),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", REMINDER_CONTENT_TABLE, companyId],
              });
            }
          })
          .catch(() => undefined)
          .finally(() => {
            inFlight.delete(key);
          });
      }
      if (!cancelled) setResolved(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, idKey, queryClient, reminders, rows, viewerLocale]);

  useEffect(() => {
    if (!translationQueryReady || ids.length === 0) return;
    const covered = new Set(rows.map((row) => row.sourceId));
    if (ids.every((id) => covered.has(id))) {
      retries.current = 0;
      return;
    }
    if (retries.current >= 2) return;
    retries.current += 1;
    const timer = setTimeout(() => {
      void refetchTranslations();
    }, 4000);
    return () => clearTimeout(timer);
  }, [idKey, ids, refetchTranslations, rows, translationQueryReady]);

  return resolved;
}
