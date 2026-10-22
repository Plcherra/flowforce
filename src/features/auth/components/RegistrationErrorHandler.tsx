import { useTranslation } from "react-i18next";
import React from "react";
import { AlertTriangle, Shield, Network, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface RegistrationError {
  type: "auth" | "validation" | "database" | "network";
  message: string;
  details?: string;
}

interface RegistrationErrorHandlerProps {
  error: RegistrationError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function RegistrationErrorHandler({
  error,
  onRetry,
  onDismiss,
}: RegistrationErrorHandlerProps) {
  const { t } = useTranslation();
  const getErrorIcon = () => {
    switch (error.type) {
      case "auth":
        return <Shield className="h-4 w-4" />;
      case "network":
        return <Network className="h-4 w-4" />;
      case "database":
        return <Database className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case "auth":
        return t("auth.authenticationError");
      case "validation":
        return t("auth.validationError");
      case "network":
        return t("auth.connectionError");
      case "database":
        return t("auth.serverError");
      default:
        return t("auth.registrationError");
    }
  };

  const getErrorVariant = () => {
    switch (error.type) {
      case "validation":
        return "default";
      case "network":
        return "destructive";
      default:
        return "destructive";
    }
  };

  const shouldShowRetry = () => {
    return error.type === "network" || error.type === "database";
  };

  const getHelpText = () => {
    switch (error.type) {
      case "auth":
        return t("auth.pleaseCheckYourEmailAndPasswordOrTryUsingADifferentEmailAddress");
      case "validation":
        return t("auth.pleaseReviewTheHighlightedFieldsAndCorrectAnyErrors");
      case "network":
        return t("auth.pleaseCheckYourInternetConnectionAndTryAgain");
      case "database":
        return t("auth.ourServersAreExperiencingIssuesPleaseTryAgainInAFewMoments");
      default:
        return t("auth.ifTheProblemPersistsPleaseContactSupport");
    }
  };

  return (
    <Alert variant={getErrorVariant()} className="my-4">
      {getErrorIcon()}
      <AlertTitle>{getErrorTitle()}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{error.message}</p>
        <p className="text-sm text-muted-foreground">{getHelpText()}</p>
        {error.details && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t("auth.technicalDetails")}</summary>
            <p className="mt-1 font-mono bg-muted p-2 rounded">
              {error.details}
            </p>
          </details>
        )}
        <div className="flex gap-2 mt-3">
          {shouldShowRetry() && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              {t("common.tryAgain")}</Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              {t("auth.dismiss")}</Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
