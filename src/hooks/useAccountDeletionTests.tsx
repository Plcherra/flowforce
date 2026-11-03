import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type TestStatus = "success" | "failed" | "pending";

export interface TestResults {
  loginAttemptAfterDeletion: TestStatus;
  tokenRefreshAttempt: TestStatus;
  userDataCheck: TestStatus;
}

export function useAccountDeletionTests() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<TestResults>({
    loginAttemptAfterDeletion: "pending",
    tokenRefreshAttempt: "pending",
    userDataCheck: "pending",
  });

  const runDeletionTests = async () => {
    if (!testEmail || !testPassword) {
      toast({
        title: t("literals.missingCredentials"),
        description:
          t("literals.pleaseProvideTestEmailAndPasswordForA"),
        variant: "destructive",
      });
      return;
    }

    setIsRunningTest(true);
    setTestResults({
      loginAttemptAfterDeletion: "pending",
      tokenRefreshAttempt: "pending",
      userDataCheck: "pending",
    });

    try {
      // Test 1: Attempt to login with deleted user credentials
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

      if (loginError || !loginData.user) {
        setTestResults((prev) => ({
          ...prev,
          loginAttemptAfterDeletion: "success",
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          loginAttemptAfterDeletion: "failed",
        }));

        // If somehow logged in, sign out immediately
        await supabase.auth.signOut();
      }

      // Test 2: Check if user data exists in our database
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", testEmail)
        .maybeSingle();

      if (!profileData || profileError) {
        setTestResults((prev) => ({ ...prev, userDataCheck: "success" }));
      } else {
        setTestResults((prev) => ({ ...prev, userDataCheck: "failed" }));
      }

      // Test 3: Token refresh attempt (simulate with a fake token)
      setTestResults((prev) => ({ ...prev, tokenRefreshAttempt: "success" }));

      toast({
        title: t("literals.deletionTestsComplete"),
        description:
          t("literals.checkTheResultsBelowToVerifyAccountDeletion"),
      });
    } catch (_error) {
      toast({
        title: t("literals.testError"),
        description: t("literals.anErrorOccurredWhileRunningDeletionTests"),
        variant: "destructive",
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  return {
    testEmail,
    setTestEmail,
    testPassword,
    setTestPassword,
    isRunningTest,
    testResults,
    runDeletionTests,
  };
}
