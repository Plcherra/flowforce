import { computeTasksCompliance } from "../kpi/computeTasksCompliance";
import { computeInventoryHealth } from "../kpi/computeInventoryHealth";
import { computeLaborVsSales } from "../kpi/computeLaborVsSales";
import { createIssue } from "./createIssue";
import { createServerLogger } from "../../utils/logger";
import i18n from "@/i18n/config";

export interface DetectIssuesOptions {
  orgId: string;
}

export async function detectIssues({ orgId }: DetectIssuesOptions) {
  const logger = createServerLogger("detectIssues", {
    orgId,
    tags: ["detector", "issues"],
  });
  logger.debug("Running issue detectors");

  try {
    const [tasks, inventory, labor] = await Promise.all([
      computeTasksCompliance(orgId),
      computeInventoryHealth(orgId),
      computeLaborVsSales(orgId),
    ]);

    const issues = [] as Array<Promise<unknown>>;

    if (tasks.severity === "critical") {
      issues.push(
        createIssue({
          orgId,
          kpiKey: tasks.kpiKey,
          issueType: "tasks",
          severity: "critical",
          title: i18n.t("operations.issueTaskComplianceTitle"),
          description: i18n.t("operations.issueTaskComplianceDescription", {
            value: tasks.value,
          }),
        }),
      );
    }

    if (inventory.severity !== "normal") {
      issues.push(
        createIssue({
          orgId,
          kpiKey: inventory.kpiKey,
          issueType: "inventory",
          severity: inventory.severity,
          title: i18n.t("operations.issueInventoryTitle"),
          description: i18n.t("operations.issueInventoryDescription"),
        }),
      );
    }

    if (labor.severity === "critical") {
      issues.push(
        createIssue({
          orgId,
          kpiKey: labor.kpiKey,
          issueType: "labor",
          severity: "critical",
          title: i18n.t("operations.issueLaborTitle"),
          description: i18n.t("operations.issueLaborDescription"),
        }),
      );
    }

    await Promise.allSettled(issues);

    logger.info("Issue detection completed", {
      context: { created: issues.length, kpisEvaluated: 3 },
    });
  } catch (error) {
    logger.error("Issue detection failed", { error });
    throw error;
  }
}
