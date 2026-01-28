import { computeTasksCompliance } from "../kpi/computeTasksCompliance";
import { computeInventoryHealth } from "../kpi/computeInventoryHealth";
import { computeLaborVsSales } from "../kpi/computeLaborVsSales";
import { createIssue } from "./createIssue";
import { createServerLogger } from "../../utils/logger";

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
          title: "Task compliance slipping",
          description: `Completion rate is ${tasks.value}% which is below the 85% target`,
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
          title: "Inventory health warning",
          description:
            "Low stock or shrinkage risks detected across key categories.",
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
          title: "Labor cost pressure",
          description:
            "Labor to sales ratio is above 33%. Consider schedule optimization.",
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
