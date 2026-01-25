# Retry Utility Usage Guide

## Overview

The retry utility (`src/utils/retry.ts`) provides exponential backoff retry logic for failed operations, improving application reliability by automatically retrying transient failures.

---

## When to Use Retry Logic

### ✅ Use Retry For:
- **Network operations** (API calls, fetch requests)
- **Database queries** (Supabase queries, RPC calls)
- **Transient failures** (network timeouts, connection errors)
- **Idempotent operations** (reads, safe updates)

### ❌ Don't Use Retry For:
- **Non-idempotent operations** (unless you handle idempotency)
- **Authentication failures** (invalid credentials won't succeed on retry)
- **Validation errors** (invalid input won't become valid)
- **Permission errors** (access denied won't change)

---

## Basic Usage

### Generic Retry

```typescript
import { retryWithBackoff } from '@/utils/retry';

// Basic usage with defaults (3 retries, 1s base delay)
const result = await retryWithBackoff(() => fetchData());

// Custom options
const result = await retryWithBackoff(
  () => fetchData(),
  {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 5000,
    multiplier: 2,
  }
);
```

### Supabase Query Retry

```typescript
import { retrySupabaseQuery } from '@/utils/retry';

// Automatically retries on network/transient database errors
const { data, error } = await retrySupabaseQuery(
  () => supabase
    .from('tasks')
    .select('*')
    .eq('company_id', companyId)
);

if (error) {
  // Handle error
  return;
}

// Use data
console.log(data);
```

---

## Configuration Options

### RetryOptions Interface

```typescript
interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelay?: number;
  
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  
  /** Multiplier for exponential backoff (default: 2) */
  multiplier?: number;
  
  /** Function to determine if error is retryable (default: all errors) */
  shouldRetry?: (error: unknown) => boolean;
  
  /** Custom error message prefix (default: 'Operation failed') */
  errorMessage?: string;
}
```

---

## Examples

### Example 1: Database Query

```typescript
import { retrySupabaseQuery } from '@/utils/retry';

export async function fetchCompanyEmployees(companyId: string) {
  const { data, error } = await retrySupabaseQuery(
    () => supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
      .eq('employment_status', 'active'),
    { maxRetries: 2, baseDelay: 500 }
  );

  if (error) throw error;
  return data ?? [];
}
```

### Example 2: RPC Call

```typescript
import { retryWithBackoff } from '@/utils/retry';

export async function getDashboardStats(companyId: string) {
  return retryWithBackoff(
    async () => {
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_company_id: companyId,
        p_today: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      return data;
    },
    { maxRetries: 3, baseDelay: 1000 }
  );
}
```

### Example 3: Custom Retry Logic

```typescript
import { retryWithBackoff } from '@/utils/retry';

export async function uploadFile(file: File) {
  return retryWithBackoff(
    () => fetch('/api/upload', {
      method: 'POST',
      body: file,
    }),
    {
      maxRetries: 5,
      baseDelay: 1000,
      shouldRetry: (error) => {
        // Only retry on network errors or 5xx status codes
        if (error instanceof TypeError) return true;
        if (error instanceof Response) {
          return error.status >= 500 && error.status < 600;
        }
        return false;
      },
    }
  );
}
```

---

## Best Practices

### 1. Choose Appropriate Retry Counts

- **Read operations**: 2-3 retries (failures are less critical)
- **Write operations**: 1-2 retries (avoid duplicate writes)
- **Critical operations**: 3-5 retries (user-facing, must succeed)

### 2. Set Reasonable Delays

- **Fast operations**: `baseDelay: 500ms` (API calls)
- **Database queries**: `baseDelay: 1000ms` (default)
- **Slow operations**: `baseDelay: 2000ms` (file uploads)

### 3. Use Specialized Functions

- Use `retrySupabaseQuery` for Supabase queries (handles Supabase-specific errors)
- Use `retryWithBackoff` for generic async operations

### 4. Handle Errors Appropriately

```typescript
try {
  const result = await retryWithBackoff(() => operation());
  return result;
} catch (error) {
  // Log error for monitoring
  logger.error('Operation failed after retries', { error });
  
  // Provide user feedback
  toast({
    title: 'Operation failed',
    description: 'Please try again later',
    variant: 'destructive',
  });
  
  throw error;
}
```

### 5. Monitor Retry Success Rates

Track retry attempts and success rates to identify:
- Network instability
- Database performance issues
- Need for retry configuration adjustments

---

## Error Detection

The retry utility automatically detects:

### Network Errors
- `TypeError` (fetch failures)
- Error messages containing: `network error`, `failed to fetch`, `timeout`, `econnreset`, `enotfound`

### Transient Database Errors
- PostgreSQL error codes: `08000`, `08003`, `08006`, `08001`, `08004`, `57P01`, `57P02`, `57P03`

### Custom Detection

You can provide a custom `shouldRetry` function:

```typescript
const result = await retryWithBackoff(
  () => operation(),
  {
    shouldRetry: (error) => {
      // Custom logic to determine if error is retryable
      if (error instanceof CustomError) {
        return error.isRetryable;
      }
      return false;
    },
  }
);
```

---

## Performance Considerations

### Retry Delays

Exponential backoff delays:
- Attempt 1: `baseDelay` (e.g., 1000ms)
- Attempt 2: `baseDelay * multiplier` (e.g., 2000ms)
- Attempt 3: `baseDelay * multiplier^2` (e.g., 4000ms)
- Capped at `maxDelay` (e.g., 10000ms)

### Total Time

With default settings (3 retries, 1s base delay):
- Best case: ~0ms (succeeds on first attempt)
- Worst case: ~7000ms (1s + 2s + 4s delays)

---

## Integration with React Query

React Query has built-in retry logic. Use the retry utility for:
- Operations outside React Query
- Custom retry logic requirements
- Operations that need different retry behavior

```typescript
// React Query handles retries automatically
const { data } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => fetchTasks(), // React Query retries automatically
});

// Use retry utility for operations outside React Query
const handleManualRefresh = async () => {
  const data = await retryWithBackoff(() => fetchTasks());
  // ...
};
```

---

## Troubleshooting

### Retries Not Working

1. Check if error is retryable (network/transient errors)
2. Verify `shouldRetry` function logic
3. Check retry logs for details

### Too Many Retries

1. Reduce `maxRetries`
2. Add stricter `shouldRetry` logic
3. Check if operation is actually idempotent

### Retries Taking Too Long

1. Reduce `baseDelay`
2. Reduce `maxDelay`
3. Reduce `maxRetries`

---

## See Also

- `src/utils/retry.ts` - Retry utility implementation
- `src/repositories/tasksRepository.ts` - Example usage in repository
- `src/hooks/useDashboardData.tsx` - Example usage in hook
