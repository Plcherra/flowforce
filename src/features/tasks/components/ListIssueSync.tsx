import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { syncListIssueTasks } from "@/features/tasks/repositories/listIssueSync";
import { logger } from "@/utils/logger";

export function ListIssueSync() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? null;
  const userId = profile?.id ?? null;

  useEffect(() => {
    if (!companyId || !userId) return;
    void syncListIssueTasks(companyId, userId).catch((error: unknown) => {
      logger.error("List issues were not synced", { error, tags: ["error"] });
    });
  }, [companyId, userId]);

  return null;
}
