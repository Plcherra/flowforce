import React, { ReactNode } from "react";
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
  loadingText = "Loading...",
  errorTitle = "Something went wrong",
  errorDescription = "An error occurred while loading the data.",
}: AsyncWrapperProps) {
  // Loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return <LoadingSpinner text={loadingText} className="py-8" />;
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
          <CardTitle className="text-lg">{errorTitle}</CardTitle>
          <CardDescription>{errorDescription}</CardDescription>
          {errorMessage && (
            <p className="text-sm text-destructive mt-2">{errorMessage}</p>
          )}
        </CardHeader>
        {onRetry && (
          <CardContent className="text-center">
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
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
  emptyTitle = "No data found",
  emptyDescription = "There is no data to display at the moment.",
  loadingText = "Loading data...",
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
  const isEmpty = !data || data.length === 0;

  const emptyState = (
    <Card className="w-full">
      <CardContent className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
        <p className="text-muted-foreground mb-4">{emptyDescription}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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
      loadingText={loadingText}
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
  loadingTitle = "Loading...",
  loadingDescription,
}: {
  children: ReactNode;
  isLoading: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  loadingTitle?: string;
  loadingDescription?: string;
}) {
  const loadingComponent = (
    <PageLoading title={loadingTitle} description={loadingDescription} />
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
