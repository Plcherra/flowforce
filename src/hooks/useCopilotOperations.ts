import { useCallback, useState } from "react";
import { useOperationsData } from "@/hooks/useOperationsData";

interface CopilotDiagnosisResponse {
  insights: unknown;
  [key: string]: unknown;
}

export function useCopilotOperations() {
  const operationsQuery = useOperationsData();
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<Error | null>(null);

  const diagnose = useCallback(async () => {
    setDiagnosing(true);
    setDiagnosisError(null);

    try {
      const response = await fetch("/functions/v1/ai-diagnose-operations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metrics: operationsQuery.data }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to run operations diagnosis (${response.status})`,
        );
      }

      return (await response.json()) as CopilotDiagnosisResponse;
    } catch (error) {
      setDiagnosisError(error as Error);
      throw error;
    } finally {
      setDiagnosing(false);
    }
  }, [operationsQuery.data]);

  return {
    ...operationsQuery,
    diagnose,
    diagnosing,
    diagnosisError,
  };
}
