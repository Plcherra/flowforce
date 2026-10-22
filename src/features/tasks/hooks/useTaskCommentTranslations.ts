import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  TASK_COMMENT_FIELD_PATH,
  TASK_COMMENT_TABLE,
  resolveTaskCommentTranslation,
  type StoredTaskCommentTranslation,
  type TaskCommentTranslation,
} from "../taskCommentContent";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface TaskCommentSource {
  id: string;
  comment: string;
  updated_at?: string | null;
}

export function useTaskCommentTranslations(comments: TaskCommentSource[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(() => comments.map((comment) => comment.id), [comments]);
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, TaskCommentTranslation | null>>(
    new Map(),
  );

  const query = useQuery({
    queryKey: ["content-translations", TASK_COMMENT_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", TASK_COMMENT_TABLE)
        .eq("field_path", TASK_COMMENT_FIELD_PATH)
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

  const rows = useMemo<StoredTaskCommentTranslation[]>(
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
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, TaskCommentTranslation | null>();
      for (const comment of comments) {
        const result = await resolveTaskCommentTranslation({
          id: comment.id,
          comment: comment.comment,
          rows,
          viewerLocale,
        });
        next.set(comment.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${comment.id}:${viewerLocale}:${comment.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: TASK_COMMENT_TABLE,
          sourceId: comment.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: [{ fieldPath: TASK_COMMENT_FIELD_PATH, text: comment.comment }],
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", TASK_COMMENT_TABLE, companyId],
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

  return resolved;
}
