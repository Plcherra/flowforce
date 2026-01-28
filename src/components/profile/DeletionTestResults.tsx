import { CheckCircle2, XCircle } from "lucide-react";
import { TestResults, TestStatus } from "@/hooks/useAccountDeletionTests";

interface DeletionTestResultsProps {
  testResults: TestResults;
}

export default function DeletionTestResults({
  testResults,
}: DeletionTestResultsProps) {
  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
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
      <h3 className="text-sm font-medium">Test Results:</h3>

      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">Login attempt should fail</span>
        <div className="flex items-center space-x-2">
          {getStatusIcon(testResults.loginAttemptAfterDeletion)}
          <span className="text-sm">
            {getStatusText(testResults.loginAttemptAfterDeletion)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">User data should be removed</span>
        <div className="flex items-center space-x-2">
          {getStatusIcon(testResults.userDataCheck)}
          <span className="text-sm">
            {getStatusText(testResults.userDataCheck)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border rounded">
        <span className="text-sm">Token refresh should fail</span>
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
