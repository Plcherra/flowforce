import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  MessageCircle,
  Calendar,
  FileText,
} from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import type { ErrorBoundaryRenderProps } from "./error-boundary";

interface FeatureErrorFallbackProps extends ErrorBoundaryRenderProps {
  featureName: string;
  icon: React.ReactNode;
  returnPath: string;
}

function FeatureErrorFallback({
  error,
  resetErrorBoundary,
  featureName,
  icon,
  returnPath,
}: FeatureErrorFallbackProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleReturn = () => {
    navigate(returnPath, { replace: true });
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border/60 shadow-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center text-destructive">
            {icon}
          </div>
          <CardTitle className="text-xl">
            {t("common.featureErrorTitle", { feature: featureName })}
          </CardTitle>
          <CardDescription>
            {t("common.featureWorkspaceError", {
              feature: featureName.toLowerCase(),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-mono text-destructive">
              {error.message}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={resetErrorBoundary} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("common.tryAgain")}
            </Button>
            <Button variant="outline" onClick={handleReturn} className="flex-1">
              {t("common.returnToDashboard")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MessagesErrorFallback(props: ErrorBoundaryRenderProps) {
  const { t } = useTranslation();
  return (
    <FeatureErrorFallback
      {...props}
      featureName={t("common.messages")}
      icon={<MessageCircle className="h-12 w-12" />}
      returnPath="/app/dashboard"
    />
  );
}

export function SchedulingErrorFallback(props: ErrorBoundaryRenderProps) {
  const { t } = useTranslation();
  return (
    <FeatureErrorFallback
      {...props}
      featureName={t("common.scheduling")}
      icon={<Calendar className="h-12 w-12" />}
      returnPath="/app/dashboard"
    />
  );
}

export function FormsErrorFallback(props: ErrorBoundaryRenderProps) {
  const { t } = useTranslation();
  return (
    <FeatureErrorFallback
      {...props}
      featureName={t("common.formsBuilder")}
      icon={<FileText className="h-12 w-12" />}
      returnPath="/app/forms"
    />
  );
}
