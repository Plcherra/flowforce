/**
 * Retry utility with exponential backoff
 * 
 * Phase 6: Error Recovery - Provides configurable retry logic for failed operations
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => supabase.from('tasks').select('*'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  multiplier?: number;
  /** Function to determine if error is retryable (default: all errors are retryable) */
  shouldRetry?: (error: unknown) => boolean;
  /** Custom error message prefix (default: 'Operation failed') */
  errorMessage?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  multiplier: 2,
  shouldRetry: () => true,
  errorMessage: 'Operation failed',
};

/**
 * Determines if an error is a network error (retryable)
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return /network\s?error|failed to fetch|timeout|econnreset|enotfound/i.test(error.message);
  }
  return false;
}

/**
 * Determines if an error is a transient database error (retryable)
 */
function isTransientDatabaseError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code);
    // PostgreSQL error codes for transient errors
    return ['08000', '08003', '08006', '08001', '08004', '57P01', '57P02', '57P03'].includes(code);
  }
  return false;
}

/**
 * Default shouldRetry function that retries on network and transient database errors
 */
function defaultShouldRetry(error: unknown): boolean {
  return isNetworkError(error) || isTransientDatabaseError(error);
}

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number, multiplier: number): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Sleeps for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async operation with exponential backoff
 * 
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const result = await retryWithBackoff(() => fetchData());
 * 
 * // Custom options
 * const result = await retryWithBackoff(
 *   () => supabase.from('tasks').select('*'),
 *   { maxRetries: 5, baseDelay: 500 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const shouldRetry = config.shouldRetry === DEFAULT_OPTIONS.shouldRetry 
    ? defaultShouldRetry 
    : config.shouldRetry;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if we've exhausted retries or error is not retryable
      if (attempt >= config.maxRetries || !shouldRetry(error)) {
        logger.error('[retry] Operation failed after retries', {
          error,
          attempt,
          maxRetries: config.maxRetries,
          tags: ['error', 'retry'],
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(
        attempt,
        config.baseDelay,
        config.maxDelay,
        config.multiplier,
      );

      logger.warn('[retry] Retrying operation', {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
        tags: ['retry', 'warning'],
      });

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retries a Supabase query operation with exponential backoff
 * 
 * @param operation - The Supabase query operation
 * @param options - Retry configuration options
 * @returns The query result
 * 
 * @example
 * ```typescript
 * const { data, error } = await retrySupabaseQuery(
 *   () => supabase.from('tasks').select('*').eq('company_id', companyId)
 * );
 * ```
 */
export async function retrySupabaseQuery<T>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  options: RetryOptions = {},
): Promise<{ data: T | null; error: unknown }> {
  return retryWithBackoff(operation, {
    ...options,
    shouldRetry: (error) => {
      // Retry on network errors or if the error object indicates a retryable error
      if (isNetworkError(error)) return true;
      
      // Check if error is a Supabase error that's retryable
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message).toLowerCase();
        return /network|timeout|connection|econnreset|enotfound/i.test(message);
      }
      
      return false;
    },
  });
}
