import React, { Component, ComponentType, ErrorInfo, ReactNode } from "react";
import { useNavigate } from "@/lib/router-adapter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logger } from "@/utils/logger";

export interface ErrorBoundaryRenderProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  fallbackRender?: (props: ErrorBoundaryRenderProps) => ReactNode;
  FallbackComponent?: ComponentType<ErrorBoundaryRenderProps>;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught:", {
      error,
      context: { errorInfo },
      tags: ["error"],
    });

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  public render() {
    const { hasError, error } = this.state;
    const { children, fallback, fallbackRender, FallbackComponent } =
      this.props;

    if (hasError && error) {
      const renderProps = {
        error,
        resetErrorBoundary: this.resetErrorBoundary,
      };

      if (FallbackComponent) {
        return <FallbackComponent {...renderProps} />;
      }

      if (fallbackRender) {
        return fallbackRender(renderProps);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={this.state.errorInfo}
          resetErrorBoundary={this.resetErrorBoundary}
          showDetails={this.props.showDetails}
        />
      );
    }

    return children ?? null;
  }
}

interface DefaultFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
  showDetails?: boolean;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  resetErrorBoundary,
  showDetails = false,
}: DefaultFallbackProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border border-border/60 shadow-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={resetErrorBoundary} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex-1">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
          {showDetails && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Error Details
              </summary>
              <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
                <p className="text-sm font-mono text-destructive">
                  {error.message}
                </p>
                {errorInfo?.componentStack && (
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { ErrorBoundary };
export default ErrorBoundary;
