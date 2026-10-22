import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface DeletionTestFormProps {
  testEmail: string;
  setTestEmail: (email: string) => void;
  testPassword: string;
  setTestPassword: (password: string) => void;
  isRunningTest: boolean;
  onRunTests: () => void;
}

export default function DeletionTestForm({
  testEmail,
  setTestEmail,
  testPassword,
  setTestPassword,
  isRunningTest,
  onRunTests,
}: DeletionTestFormProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="testEmail">{t("profile.testEmailForDeletedAccount")}</Label>
        <Input
          id="testEmail"
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder={t("profile.emailExampleCom")}
          disabled={isRunningTest}
        />
      </div>
      <div>
        <Label htmlFor="testPassword">{t("profile.testPassword")}</Label>
        <Input
          id="testPassword"
          type="password"
          value={testPassword}
          onChange={(e) => setTestPassword(e.target.value)}
          placeholder={t("profile.password")}
          disabled={isRunningTest}
        />
      </div>

      <Button
        onClick={onRunTests}
        disabled={isRunningTest || !testEmail || !testPassword}
        className="w-full"
      >
        {isRunningTest ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t("profile.runningTests")}
          </>
        ) : (
          "Run Deletion Tests"
        )}
      </Button>
    </div>
  );
}
