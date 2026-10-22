import React, { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LoadingSpinner, PageLoading } from "./loading-states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface AsyncWrapperProps {
  children: ReactNode;
  isLoading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  loadingText?: string;
  errorTitle?: string;
  errorDescription?: string;
}

// Generic wrapper for async operations
export function AsyncWrapper({
  children,
  isLoading,
  error,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyState,
  isEmpty = false,
  loadingText,
  errorTitle,
  errorDescription,
}: AsyncWrapperProps) {
  const { t } = useTranslation();
  const resolvedLoadingText = loadingText ?? t("common.loading");
  const resolvedErrorTitle = errorTitle ?? t("common.somethingWentWrong");
  const resolvedErrorDescription =
    errorDescription ?? t("common.loadingDataError");

  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return <LoadingSpinner text={resolvedLoadingText} className="py-8" />;
  }

  // Error state
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    const errorMessage = typeof error === "string" ? error : error.message;

    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-lg">{resolvedErrorTitle}</CardTitle>
          <CardDescription>{resolvedErrorDescription}</CardDescription>
          {errorMessage && (
            <p className="text-sm text-destructive mt-2">{errorMessage}</p>
          )}
        </CardHeader>
        {onRetry && (
          <CardContent className="text-center">
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("common.tryAgain")}
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // Empty state
  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  // Success state
  return <>{children}</>;
}

// Specialized wrapper for data lists
export function DataListWrapper({
  children,
  isLoading,
  error,
  onRetry,
  data,
  emptyTitle,
  emptyDescription,
  loadingText,
}: {
  children: ReactNode;
  isLoading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  data?: any[] | null;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingText?: string;
}) {
  const { t } = useTranslation();
  const isEmpty = !data || data.length === 0;
  const resolvedEmptyTitle = emptyTitle ?? t("common.noDataFound");
  const resolvedEmptyDescription =
    emptyDescription ?? t("common.noDataToDisplay");
  const resolvedLoadingText = loadingText ?? t("common.loadingData");

  const emptyState = (
    <Card className="w-full">
      <CardContent className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">{resolvedEmptyTitle}</h3>
        <p className="text-muted-foreground mb-4">{resolvedEmptyDescription}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("common.refresh")}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AsyncWrapper
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={isEmpty}
      emptyState={emptyState}
      loadingText={resolvedLoadingText}
    >
      {children}
    </AsyncWrapper>
  );
}

// Page-level async wrapper
export function PageAsyncWrapper({
  children,
  isLoading,
  error,
  onRetry,
  loadingTitle,
  loadingDescription,
}: {
  children: ReactNode;
  isLoading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  loadingTitle?: string;
  loadingDescription?: string;
}) {
  const { t } = useTranslation();
  const loadingComponent = (
    <PageLoading
      title={loadingTitle ?? t("common.loading")}
      description={loadingDescription}
    />
  );

  return (
    <AsyncWrapper
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      loadingComponent={loadingComponent}
    >
      {children}
    </AsyncWrapper>
  );
}
