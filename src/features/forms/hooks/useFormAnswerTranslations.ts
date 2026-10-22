import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import type { StoredFormTranslation } from "@/features/forms/formContentFields";
import { FORM_FIELD_TRANSLATION_BATCH } from "@/features/forms/formFieldContent";
import {
  FORM_SUBMISSION_TABLE,
  proseAnswers,
  resolveSubmissionAnswers,
  type FormAnswerField,
  type FormAnswerTranslation,
} from "@/features/forms/formAnswerContent";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface SubmissionAnswerSource {
  id?: string;
  submissionData?: Record<string, unknown> | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function useFormAnswerTranslations(
  submissions: SubmissionAnswerSource[],
  fields: FormAnswerField[],
) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => submissions.map((submission) => submission.id).filter((id): id is string => Boolean(id)),
    [submissions],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, FormAnswerTranslation | null>>(
    new Map(),
  );

  const query = useQuery({
    queryKey: ["content-translations", FORM_SUBMISSION_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", FORM_SUBMISSION_TABLE)
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
    if (!companyId || submissions.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, FormAnswerTranslation | null>();
      for (const submission of submissions) {
        if (!submission.id) continue;
        const submissionData = asRecord(submission.submissionData);
        const result = await resolveSubmissionAnswers({
          id: submission.id,
          submissionData,
          fields,
          rows,
          viewerLocale,
        });
        next.set(submission.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const parts = proseAnswers({ submissionData, fields });
        const key = `${submission.id}:${viewerLocale}:${parts.length}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        const requests = [];
        for (let index = 0; index < parts.length; index += FORM_FIELD_TRANSLATION_BATCH) {
          requests.push(
            requestContentTranslation({
              companyId,
              sourceTable: FORM_SUBMISSION_TABLE,
              sourceId: submission.id,
              sourceLocale: result.sourceLocale,
              viewerLocale,
              fields: parts
                .slice(index, index + FORM_FIELD_TRANSLATION_BATCH)
                .map((answer) => ({ fieldPath: answer.fieldPath, text: answer.text })),
            }),
          );
        }
        void Promise.all(requests)
          .then((results) => {
            if (results.some(Boolean) && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", FORM_SUBMISSION_TABLE, companyId],
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
  }, [companyId, fields, idKey, queryClient, rows, submissions, viewerLocale]);

  return resolved;
}
