import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { TestResults, TestStatus } from "@/hooks/useAccountDeletionTests";

interface DeletionTestResultsProps {
  testResults: TestResults;
}

export default function DeletionTestResults({
  testResults,
}: DeletionTestResultsProps) {
  const { t } = useTranslation();
  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <div className="h-4 w-4 rounded-full bg-muted-foreground" />;
    }
  };

  const getStatusText = (status: TestStatus) => {
    switch (status) {
      case "success":
        return "Passed";
      case "failed":
        return "Failed";
      case "pending":
        return "Pending";
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("profile.testResults")}</h3>

      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">{t("profile.loginAttemptShouldFail")}</span>
        <div className="flex items-center space-x-2">
          {getStatusIcon(testResults.loginAttemptAfterDeletion)}
          <span className="text-sm">
            {getStatusText(testResults.loginAttemptAfterDeletion)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">{t("profile.userDataShouldBeRemoved")}</span>
        <div className="flex items-center space-x-2">
          {getStatusIcon(testResults.userDataCheck)}
          <span className="text-sm">
            {getStatusText(testResults.userDataCheck)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">{t("profile.tokenRefreshShouldFail")}</span>
        <div className="flex items-center space-x-2">
          {getStatusIcon(testResults.tokenRefreshAttempt)}
          <span className="text-sm">
            {getStatusText(testResults.tokenRefreshAttempt)}
          </span>
        </div>
      </div>
    </div>
  );
}
