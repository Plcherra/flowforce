import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  resolveCompanyUpdateTranslation,
  type CompanyUpdateContentTranslation,
  type StoredContentTranslation,
} from "@/features/company-updates/companyUpdateFields";
import { companyUpdateTranslationFields } from "@/features/company-updates/companyUpdateFields";
import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { CompanyUpdate } from "@/types/companyUpdates";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export function useCompanyUpdateContentTranslations(updates: CompanyUpdate[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => updates.map((update) => update.id).filter(Boolean),
    [updates],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<
    Map<string, CompanyUpdateContentTranslation | null>
  >(new Map());

  const query = useQuery({
    queryKey: ["content-translations", "company_updates", companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", "company_updates")
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

  const rows = useMemo<StoredContentTranslation[]>(
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
    if (!companyId || updates.length === 0) {
      setResolved(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, CompanyUpdateContentTranslation | null>();
      for (const update of updates) {
        const result = await resolveCompanyUpdateTranslation(
          update,
          rows,
          viewerLocale,
        );
        next.set(update.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${update.id}:${viewerLocale}:${update.updatedAt}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: "company_updates",
          sourceId: update.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: companyUpdateTranslationFields(update).map((field) => ({
            fieldPath: field.fieldPath,
            text: field.text,
          })),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", "company_updates", companyId],
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
  }, [companyId, idKey, queryClient, rows, updates, viewerLocale]);

  return resolved;
}
