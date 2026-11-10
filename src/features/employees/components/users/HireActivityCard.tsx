import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { hireActivityKey } from "../../hireActivity";
import { describeActivity } from "@/features/system/utils/activityHistory";
import { openRequiredHiringBlocks, type HiringAnswer, type HiringBlock } from "@/features/employee-onboarding/hiringModel";
import { hiringBlockFromRow } from "@/features/employee-onboarding/hiringStore";

function stepName(row: Record<string, unknown>) {
  const next = row.new_values;
  if (next && typeof next === "object" && !Array.isArray(next)) {
    const step = (next as Record<string, unknown>).step;
    if (typeof step === "string" && step.trim()) return step;
  }
  return "";
}

export function HireActivityCard({
  profileId,
  companyId,
  name,
}: {
  profileId: string;
  companyId: string | null;
  name: string;
}) {
  const { t } = useTranslation();
  const activity = useQuery({
    queryKey: ["hire-activity", profileId, companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [events, blocks, responses] = await Promise.all([
        db
          .from("audit_log")
          .select("id, action, created_at, new_values")
          .eq("target_user_id", profileId)
          .eq("company_id", companyId ?? "")
          .in("action", [
            "hire.activated",
            "hire.step_completed",
            "hire.file_submitted",
            "hire.onboarding_finished",
          ])
          .order("created_at", { ascending: false })
          .limit(30),
        db
          .from("hiring_blocks")
          .select("id, kind, title, body, required, sort_order, link_url, file_name, storage_path, archived_at")
          .eq("company_id", companyId ?? ""),
        db
          .from("hiring_responses")
          .select("block_id, text_value, bool_value, date_value, file_name, status")
          .eq("profile_id", profileId)
          .eq("company_id", companyId ?? ""),
      ]);
      const blockRows = ((blocks.data ?? []) as Record<string, unknown>[])
        .filter((row) => !row.archived_at)
        .map(hiringBlockFromRow);
      const answers: Record<string, HiringAnswer> = {};
      for (const row of responses.data ?? []) {
        const record = row as Record<string, unknown>;
        const blockId = String(record.block_id ?? "");
        answers[blockId] = {
          blockId,
          textValue: typeof record.text_value === "string" ? record.text_value : "",
          boolValue: typeof record.bool_value === "boolean" ? record.bool_value : null,
          dateValue: typeof record.date_value === "string" ? record.date_value : null,
          fileName: typeof record.file_name === "string" ? record.file_name : null,
          done: record.status === "done" || record.status === "verified",
          verified: record.status === "verified",
        };
      }
      const required = blockRows.filter((block) => block.required && block.kind !== "share_file");
      return {
        events: events.data ?? [],
        open: openRequiredHiringBlocks(blockRows, answers).length,
        required: required.length,
      };
    },
  });

  const rows = activity.data?.events ?? [];
  const required = activity.data?.required ?? 0;

  return (
    <Card data-testid="hire-activity">
      <CardHeader>
        <CardTitle>{t("hireActivity.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {required > 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="hire-activity-progress">
            {t("hireActivity.progress", {
              done: required - (activity.data?.open ?? required),
              total: required,
            })}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("hireActivity.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const record = row as Record<string, unknown>;
              const action = String(record.action ?? "");
              const key = hireActivityKey(action);
              const when = typeof record.created_at === "string" ? record.created_at : "";
              return (
                <li key={String(record.id)} className="text-sm" data-testid="hire-activity-row">
                  <p>
                    {key
                      ? t(key, { name, step: stepName(record) })
                      : describeActivity(t, {
                          action,
                          new_values: record.new_values,
                          subject: { first_name: name.split(" ")[0], last_name: name.split(" ").slice(1).join(" ") },
                        })}
                  </p>
                  {when ? (
                    <p className="text-xs text-muted-foreground">
                      {new Date(when).toLocaleString()}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export type { HiringBlock };
