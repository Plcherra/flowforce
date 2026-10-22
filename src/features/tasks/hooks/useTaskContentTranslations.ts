import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  TASK_CONTENT_TABLE,
  resolveTaskContentTranslation,
  taskContentTranslationFields,
  type StoredTaskTranslation,
  type TaskContentTranslation,
} from "../taskContentFields";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface TaskContentSource {
  id?: string;
  title?: string | null;
  description?: string | null;
  links?: unknown;
  updated_at?: string | null;
}

export function useTaskContentTranslations(tasks: TaskContentSource[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => tasks.map((task) => task.id).filter((id): id is string => Boolean(id)),
    [tasks],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, TaskContentTranslation | null>>(
    new Map(),
  );

  const query = useQuery({
    queryKey: ["content-translations", TASK_CONTENT_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", TASK_CONTENT_TABLE)
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

  const rows = useMemo<StoredTaskTranslation[]>(
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
    if (!companyId || tasks.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, TaskContentTranslation | null>();
      for (const task of tasks) {
        if (!task.id) continue;
        const source = {
          id: task.id,
          title: task.title ?? "",
          description: task.description,
          links: task.links,
        };
        const result = await resolveTaskContentTranslation(source, rows, viewerLocale);
        next.set(task.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${task.id}:${viewerLocale}:${task.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: TASK_CONTENT_TABLE,
          sourceId: task.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: taskContentTranslationFields(source),
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", TASK_CONTENT_TABLE, companyId],
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
  }, [companyId, idKey, queryClient, rows, tasks, viewerLocale]);

  return resolved;
}
