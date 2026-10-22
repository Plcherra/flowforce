import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import {
  FORM_CONTENT_TABLE,
  formContentTranslationFields,
  resolveFormContentTranslation,
  type FormContentTranslation,
  type StoredFormTranslation,
} from "@/features/forms/formContentFields";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface FormContentSource {
  id?: string;
  title?: string | null;
  description?: string | null;
  settings?: unknown;
  updated_at?: string | null;
}

export function useFormContentTranslations(forms: FormContentSource[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => forms.map((form) => form.id).filter((id): id is string => Boolean(id)),
    [forms],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, FormContentTranslation | null>>(
    new Map(),
  );

  const query = useQuery({
    queryKey: ["content-translations", FORM_CONTENT_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", FORM_CONTENT_TABLE)
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

  const rows = useMemo<StoredFormTranslation[]>(
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
    if (!companyId || forms.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, FormContentTranslation | null>();
      for (const form of forms) {
        if (!form.id) continue;
        const source = {
          id: form.id,
          title: form.title ?? "",
          description: form.description,
          settings: form.settings,
        };
        const result = await resolveFormContentTranslation(source, rows, viewerLocale);
        next.set(form.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${form.id}:${viewerLocale}:${form.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: FORM_CONTENT_TABLE,
          sourceId: form.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: formContentTranslationFields(source),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", FORM_CONTENT_TABLE, companyId],
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
  }, [companyId, forms, idKey, queryClient, rows, viewerLocale]);

  return resolved;
}
