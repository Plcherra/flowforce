// Centralized error handling utilities
import { toast } from '@/hooks/use-toast';

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

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error(`Error in ${context || 'unknown context'}:`, error);
  }

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