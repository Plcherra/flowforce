
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountDeletionTests } from '@/hooks/useAccountDeletionTests';
import DeletionTestForm from './DeletionTestForm';
import DeletionTestResults from './DeletionTestResults';
import DeletionTestInstructions from './DeletionTestInstructions';

export default function AccountDeletionTest() {
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
        <CardTitle>Account Deletion Test Suite</CardTitle>
        <CardDescription>
          Test that account deletion properly removes users and prevents future logins
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
