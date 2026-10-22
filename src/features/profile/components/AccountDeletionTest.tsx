import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAccountDeletionTests } from "@/hooks/useAccountDeletionTests";
import DeletionTestForm from "./DeletionTestForm";
import DeletionTestResults from "./DeletionTestResults";
import DeletionTestInstructions from "./DeletionTestInstructions";

export default function AccountDeletionTest() {
  const { t } = useTranslation();
  const {
    testEmail,
    setTestEmail,
    testPassword,
    setTestPassword,
    isRunningTest,
    testResults,
    runDeletionTests,
  } = useAccountDeletionTests();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t("profile.accountDeletionTestSuite")}</CardTitle>
        <CardDescription>
          {t("profile.testThatAccountDeletionProperlyRemovesUsersAndPreventsFutureLogins")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DeletionTestForm
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          testPassword={testPassword}
          setTestPassword={setTestPassword}
          isRunningTest={isRunningTest}
          onRunTests={runDeletionTests}
        />

        <DeletionTestResults testResults={testResults} />

        <DeletionTestInstructions />
      </CardContent>
    </Card>
  );
}
