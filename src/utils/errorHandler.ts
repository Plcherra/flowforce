// Centralized error handling utilities
import { toast } from '@/hooks/use-toast';
import { captureError } from '@/utils/logger';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Type guard to check if error has a message property
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Type guard to check if error has a code property
 */
function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Extract error message from unknown error type
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Extract error code from unknown error type
 */
function extractErrorCode(error: unknown): string {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

export function handleError(error: unknown, context?: string): AppError {
  const errorMessage = extractErrorMessage(error);
  const errorCode = extractErrorCode(error);
  
  const appError: AppError = {
    message: errorMessage,
    code: errorCode,
    details: error
  };

  captureError(error, {
    message: context ? `${context}: ${errorMessage}` : errorMessage,
    context: {
      code: errorCode,
      context,
    },
  });

  return appError;
}

export function showErrorToast(error: unknown, context?: string) {
  const appError = handleError(error, context);
  
  toast({
    title: "Error",
    description: appError.message,
    variant: "destructive",
  });
}

export function showSuccessToast(message: string) {
  toast({
    title: "Success",
    description: message,
  });
}
