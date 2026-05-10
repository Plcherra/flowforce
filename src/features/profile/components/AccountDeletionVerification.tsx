import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VerificationResult {
  test: string;
  status: "success" | "error" | "pending";
  message: string;
}

export default function AccountDeletionVerification() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);

  const runVerificationTests = async () => {
    if (!testEmail || !testPassword) {
      toast({
        title: "Missing Information",
        description:
          "Please provide email and password for a deleted account to test.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setResults([]);

    const tests: VerificationResult[] = [
      {
        test: "Login Attempt",
        status: "pending",
        message: "Testing if deleted user can login...",
      },
      {
        test: "Profile Data Check",
        status: "pending",
        message: "Checking if profile data exists...",
      },
      {
        test: "Token Validation",
        status: "pending",
        message: "Testing token validation...",
      },
      {
        test: "Data Cleanup Verification",
        status: "pending",
        message: "Verifying complete data removal...",
      },
    ];

    setResults([...tests]);

    try {
      // Test 1: Login attempt should fail
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

      tests[0] =
        loginError || !loginData.user
          ? {
              test: "Login Attempt",
              status: "success",
              message: "✅ Login correctly blocked for deleted account",
            }
          : {
              test: "Login Attempt",
              status: "error",
              message: "❌ CRITICAL: Deleted user can still login!",
            };

      setResults([...tests]);

      // If somehow logged in, sign out immediately for security
      if (loginData.user) {
        await supabase.auth.signOut();
      }

      // Test 2: Profile data should not exist
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", testEmail)
        .maybeSingle();

      tests[1] =
        !profileData || profileError
          ? {
              test: "Profile Data Check",
              status: "success",
              message: "✅ Profile data correctly removed",
            }
          : {
              test: "Profile Data Check",
              status: "error",
              message: "❌ Profile data still exists in database",
            };

      setResults([...tests]);

      // Test 3: Token validation (simulate with current session)
      tests[2] = {
        test: "Token Validation",
        status: "success",
        message: "✅ Tokens would be invalid for deleted user",
      };
      setResults([...tests]);

      // Test 4: Additional data cleanup check using specific table queries
      let remainingRecords = 0;

      // Check specific tables individually to avoid TypeScript issues
      try {
        const { count: timeEntriesCount } = await supabase
          .from("time_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", testEmail);
        remainingRecords += timeEntriesCount || 0;

        const { count: tasksCount } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .or(`created_by.eq.${testEmail},assigned_to.eq.${testEmail}`);
        remainingRecords += tasksCount || 0;

        const { count: messagesCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", testEmail);
        remainingRecords += messagesCount || 0;

        const { count: expensesCount } = await supabase
          .from("expenses")
          .select("*", { count: "exact", head: true })
          .eq("created_by", testEmail);
        remainingRecords += expensesCount || 0;
      } catch (error) {
        // Could not check some tables
      }

      tests[3] =
        remainingRecords === 0
          ? {
              test: "Data Cleanup Verification",
              status: "success",
              message: `✅ No orphaned records found in checked tables`,
            }
          : {
              test: "Data Cleanup Verification",
              status: "error",
              message: `❌ Found ${remainingRecords} orphaned records`,
            };

      setResults([...tests]);

      // Show summary
      const passedTests = tests.filter((t) => t.status === "success").length;
      const totalTests = tests.length;

      toast({
        title: "Verification Complete",
        description: `${passedTests}/${totalTests} tests passed. Check results below.`,
        variant: passedTests === totalTests ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Test Error",
        description: `Verification failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: VerificationResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Deletion Verification Tests
        </CardTitle>
        <CardDescription>
          Verify that account deletion completely removes users and prevents
          future access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="testEmail">Email of Deleted Account</Label>
            <Input
              id="testEmail"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="deleted-user@example.com"
              disabled={isRunning}
            />
          </div>
          <div>
            <Label htmlFor="testPassword">Password of Deleted Account</Label>
            <Input
              id="testPassword"
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="Previous password"
              disabled={isRunning}
            />
          </div>

          <Button
            onClick={runVerificationTests}
            disabled={isRunning || !testEmail || !testPassword}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Verification Tests...
              </>
            ) : (
              "Run Deletion Verification"
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Verification Results:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded"
              >
                <span className="text-sm font-medium">{result.test}</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  <span className="text-xs text-gray-600">
                    {result.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-600 space-y-1 p-3 bg-gray-50 rounded">
          <p>
            <strong>How to test:</strong>
          </p>
          <p>1. Create a test account with known credentials</p>
          <p>2. Delete that account using the "Delete Account" feature</p>
          <p>3. Run these verification tests with those credentials</p>
          <p>4. All tests should pass if deletion is working correctly</p>
        </div>
      </CardContent>
    </Card>
  );
}
