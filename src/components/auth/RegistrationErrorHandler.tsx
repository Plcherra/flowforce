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
        return "Authentication Error";
      case "validation":
        return "Validation Error";
      case "network":
        return "Connection Error";
      case "database":
        return "Server Error";
      default:
        return "Registration Error";
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
        return "Please check your email and password, or try using a different email address.";
      case "validation":
        return "Please review the highlighted fields and correct any errors.";
      case "network":
        return "Please check your internet connection and try again.";
      case "database":
        return "Our servers are experiencing issues. Please try again in a few moments.";
      default:
        return "If the problem persists, please contact support.";
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
            <summary className="cursor-pointer">Technical details</summary>
            <p className="mt-1 font-mono bg-muted p-2 rounded">
              {error.details}
            </p>
          </details>
        )}
        <div className="flex gap-2 mt-3">
          {shouldShowRetry() && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
