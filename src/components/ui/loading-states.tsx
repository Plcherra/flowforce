import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// Generic loading spinner
export function LoadingSpinner({
  size = "default",
  className,
  text,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
  text?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2
          className={cn("animate-spin text-primary", sizeClasses[size])}
        />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    </div>
  );
}

// Page-level loading state
export function PageLoading({
  title = "Loading...",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="text-lg font-semibold mt-4">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}

// Data table loading skeleton
export function TableLoadingSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card loading skeleton
export function CardLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={`card-skeleton-${i}`}>
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-8 w-1/3 mt-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Form loading skeleton
export function FormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

// Dashboard stats loading
export function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={`stat-skeleton-${i}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Button loading state
export function LoadingButton({
  children,
  isLoading,
  loadingText = "Loading...",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading: boolean;
  loadingText?: string;
}) {
  return (
    <button
      className={cn("inline-flex items-center", className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  );
}

// List item loading skeleton
export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`list-skeleton-${i}`}
          className="flex items-center space-x-4 p-4 border rounded-lg"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Inline loading with text
export function InlineLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{text}</span>
    </div>
  );
}

// Full screen loading overlay
export function LoadingOverlay({
  isVisible,
  text = "Loading...",
  description,
}: {
  isVisible: boolean;
  text?: string;
  description?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <LoadingSpinner size="lg" />
            <div>
              <h3 className="font-semibold">{text}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
