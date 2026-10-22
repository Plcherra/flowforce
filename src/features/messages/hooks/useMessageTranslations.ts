import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { requestContentTranslation } from "@/features/i18n/requestContentTranslation";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

import {
  MESSAGE_FIELD_PATH,
  MESSAGE_TABLE,
  resolveMessageTranslation,
  type MessageTranslation,
  type StoredMessageTranslation,
} from "../messageContent";

const inFlight = new Set<string>();
const attempted = new Set<string>();

export interface MessageSource {
  id?: string;
  content?: string | null;
  updated_at?: string | null;
}

export function useMessageTranslations(messages: MessageSource[]) {
  const { i18n } = useTranslation();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const viewerLocale = appLanguageFromTag(i18n.resolvedLanguage || i18n.language);
  const ids = useMemo(
    () => messages.map((message) => message.id).filter((id): id is string => Boolean(id)),
    [messages],
  );
  const idKey = useMemo(() => ids.slice().sort().join(","), [ids]);
  const [resolved, setResolved] = useState<Map<string, MessageTranslation | null>>(new Map());

  const query = useQuery({
    queryKey: ["content-translations", MESSAGE_TABLE, companyId, idKey],
    enabled: Boolean(companyId && ids.length > 0),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select(
          "source_id, field_path, locale, source_locale, source_hash, translated_text",
        )
        .eq("source_table", MESSAGE_TABLE)
        .eq("field_path", MESSAGE_FIELD_PATH)
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

  const rows = useMemo<StoredMessageTranslation[]>(
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
    if (!companyId || messages.length === 0) {
      setResolved((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Map<string, MessageTranslation | null>();
      for (const message of messages) {
        if (!message.id || typeof message.content !== "string") continue;
        const result = await resolveMessageTranslation({
          id: message.id,
          content: message.content,
          rows,
          viewerLocale,
        });
        next.set(message.id, result.translation);
        if (!result.needsRequest || !result.sourceLocale || cancelled) continue;
        const key = `${message.id}:${viewerLocale}:${message.updated_at ?? ""}`;
        if (inFlight.has(key) || attempted.has(key)) continue;
        attempted.add(key);
        inFlight.add(key);
        void requestContentTranslation({
          companyId,
          sourceTable: MESSAGE_TABLE,
          sourceId: message.id,
          sourceLocale: result.sourceLocale,
          viewerLocale,
          fields: [{ fieldPath: MESSAGE_FIELD_PATH, text: message.content }],
        })
          .then((ok) => {
            if (ok && !cancelled) {
              void queryClient.invalidateQueries({
                queryKey: ["content-translations", MESSAGE_TABLE, companyId],
              });
            }
          })
          .catch(() => undefined)
          .finally(() => inFlight.delete(key));
      }
      if (!cancelled) setResolved(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, idKey, messages, queryClient, rows, viewerLocale]);

  return resolved;
}
