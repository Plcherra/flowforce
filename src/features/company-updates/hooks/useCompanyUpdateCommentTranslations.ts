import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  COMPANY_UPDATE_COMMENT_FIELD_PATH,
  COMPANY_UPDATE_COMMENT_TABLE,
  resolveCommentTranslation,
  type CommentContentTranslation,
} from "@/features/company-updates/companyUpdateCommentTranslation";
import type { StoredContentTranslation } from "@/features/company-updates/companyUpdateFields";
import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { UpdateComment } from "@/types/companyUpdates";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export function useCompanyUpdateCommentTranslations(comments: UpdateComment[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => comments.map((comment) => comment.id).filter((id) => !id.startsWith("temp-")),
    [comments],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, CommentContentTranslation | null>>(
    new Map(),
  );
  const retries = useRef(0);

  const query = useQuery({
    queryKey: ["content-translations", COMPANY_UPDATE_COMMENT_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", COMPANY_UPDATE_COMMENT_TABLE)
        .eq("field_path", COMPANY_UPDATE_COMMENT_FIELD_PATH)
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
    if (!companyId || comments.length === 0) {
      setResolved(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, CommentContentTranslation | null>();
      for (const comment of comments) {
        if (comment.id.startsWith("temp-")) continue;
        const result = await resolveCommentTranslation({
          id: comment.id,
          content: comment.content,
          rows,
          viewerLocale,
        });
        next.set(comment.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${comment.id}:${viewerLocale}:${comment.updatedAt}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: COMPANY_UPDATE_COMMENT_TABLE,
          sourceId: comment.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: [{ fieldPath: COMPANY_UPDATE_COMMENT_FIELD_PATH, text: comment.content }],
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", COMPANY_UPDATE_COMMENT_TABLE, companyId],
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
  }, [comments, companyId, idKey, queryClient, rows, viewerLocale]);

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
