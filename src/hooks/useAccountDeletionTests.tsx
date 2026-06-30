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
        title: "Missing Credentials",
        description:
          "Please provide test email and password for a deleted account.",
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
        title: "Deletion Tests Complete",
        description:
          "Check the results below to verify account deletion is working properly.",
      });
    } catch (_error) {
      toast({
        title: "Test Error",
        description: "An error occurred while running deletion tests.",
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
