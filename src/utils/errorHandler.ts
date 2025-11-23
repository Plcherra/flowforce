// Centralized error handling utilities
import { toast } from '@/hooks/use-toast';
import { captureError } from '@/utils/logger';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export function handleError(error: any, context?: string): AppError {
  const errorMessage = error?.message || 'An unexpected error occurred';
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  
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

export function showErrorToast(error: any, context?: string) {
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
