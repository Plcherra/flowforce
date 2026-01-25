# Monitoring & Metrics Recommendations
**Date:** January 22, 2026  
**Status:** 📋 **RECOMMENDATIONS**

## Overview

This document provides recommendations for enhancing monitoring and metrics capabilities in the FlowForce application, based on the current state and production readiness requirements.

---

## Current Monitoring State

### ✅ What's Already in Place

#### Error Logging System
- **Client Logger**: `src/utils/logger.ts` - Structured logging with levels (debug, info, warn, error)
- **Server Logger**: `app/api/_server/utils/logger.ts` - Server-side structured logging
- **Log Storage**: `system_logs` table in Supabase for persistent storage
- **Log Ingestion**: `app/api/logs/route.ts` - API endpoint for client log ingestion
- **Error Boundaries**: React error boundaries for graceful error recovery
- **Global Error Capture**: Uncaught errors and unhandled promise rejections

#### Security Monitoring
- **RLS Policies**: All Supabase tables secured with Row Level Security
- **Tenant Isolation**: Comprehensive (1,296+ `company_id` filters verified)
- **Security Warnings**: Logged for monitoring
- **Audit Infrastructure**: Ready for integration

#### Logging Features
- Log levels: debug, info, warn, error
- Contextual logging: org ID, user ID, request ID
- Tag-based categorization
- Remote log forwarding
- Configurable via environment variables

---

## Recommended Enhancements

### 1. Error Tracking: Sentry Integration

**Priority:** 🔴 **High** (Before Production)

**Current Gap:**
- No external error tracking service
- Errors stored in `system_logs` but no real-time alerts
- No error grouping or deduplication
- No user context or session replay

**Recommended Solution:**
Integrate Sentry for comprehensive error tracking.

**Benefits:**
- Real-time error alerts
- Error grouping and deduplication
- User context and session replay
- Release tracking
- Performance monitoring integration
- Source map support for better stack traces

**Implementation Steps:**

1. **Install Sentry SDK:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize Sentry** (`sentry.client.config.ts`):
   ```typescript
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
     integrations: [
       new Sentry.BrowserTracing(),
     ],
   });
   ```

3. **Integrate with Existing Logger:**
   ```typescript
   // src/utils/logger.ts
   import * as Sentry from '@sentry/nextjs';

   function log(level: LogLevel, scope: string, message: string, meta: LogMeta = {}) {
     // ... existing logging ...

     // Forward errors to Sentry
     if (level === 'error' && meta.error) {
       Sentry.captureException(meta.error, {
         tags: meta.tags,
         extra: meta.context,
         user: meta.userId ? { id: meta.userId } : undefined,
       });
     }
   }
   ```

4. **Configure Error Boundaries:**
   ```typescript
   // src/components/ui/error-boundary.tsx
   import * as Sentry from '@sentry/nextjs';

   componentDidCatch(error: Error, errorInfo: ErrorInfo) {
     Sentry.captureException(error, {
       contexts: { react: { componentStack: errorInfo.componentStack } },
     });
     // ... existing error handling ...
   }
   ```

**Environment Variables:**
```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token
```

**Estimated Effort:** 2-3 hours

---

### 2. Performance Monitoring: Web Vitals & API Metrics

**Priority:** 🟡 **Medium-High** (Post-Launch)

**Current Gap:**
- No web vitals tracking (LCP, FID, CLS, TTFB)
- No API response time monitoring
- No component render time tracking
- No bundle size monitoring

**Recommended Solution:**
Implement performance monitoring using Sentry Performance (if using Sentry) or Vercel Analytics.

**Benefits:**
- Core Web Vitals tracking
- API performance monitoring
- Component performance insights
- Bundle size tracking
- User experience metrics

**Implementation Steps:**

1. **Track Web Vitals** (if using Sentry):
   ```typescript
   // app/providers.tsx
   import { onCLS, onFID, onLCP } from 'web-vitals';

   useEffect(() => {
     onCLS((metric) => {
       logger.info('CLS', { context: { value: metric.value } });
       // Send to Sentry or analytics
     });
     onFID((metric) => {
       logger.info('FID', { context: { value: metric.value } });
     });
     onLCP((metric) => {
       logger.info('LCP', { context: { value: metric.value } });
     });
   }, []);
   ```

2. **Monitor API Routes:**
   ```typescript
   // app/api/_server/utils/logger.ts
   export function withPerformanceLogging<T>(
     fn: () => Promise<T>,
     route: string
   ): Promise<T> {
     const start = performance.now();
     return fn().finally(() => {
       const duration = performance.now() - start;
       logger.info('API route completed', {
         context: { route, duration },
         tags: ['performance', 'api'],
       });
     });
   }
   ```

3. **Track Database Query Performance:**
   ```typescript
   // Wrap Supabase queries
   const start = performance.now();
   const { data, error } = await supabase.from('table').select();
   const duration = performance.now() - start;
   
   if (duration > 1000) { // Log slow queries
     logger.warn('Slow query detected', {
       context: { table: 'table', duration },
       tags: ['performance', 'database'],
     });
   }
   ```

**Alternative: Vercel Analytics**
If deployed on Vercel, use Vercel Analytics for built-in performance monitoring.

**Estimated Effort:** 3-4 hours

---

### 3. Database Monitoring: Slow Query Tracking

**Priority:** 🟡 **Medium** (Post-Launch)

**Current Gap:**
- No slow query detection
- No query execution time tracking
- No database connection pool monitoring
- No index usage analysis

**Recommended Solution:**
Use Supabase's built-in monitoring + custom slow query tracking.

**Benefits:**
- Slow query detection
- Query performance insights
- Index usage analysis
- Connection pool monitoring

**Implementation Steps:**

1. **Enable pg_stat_statements** (if available):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. **Create Slow Query RPC Function:**
   ```sql
   CREATE OR REPLACE FUNCTION get_slow_queries(
     threshold_ms INTEGER DEFAULT 1000
   )
   RETURNS TABLE (
     query TEXT,
     calls BIGINT,
     total_time DOUBLE PRECISION,
     mean_time DOUBLE PRECISION
   )
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       pg_stat_statements.query,
       pg_stat_statements.calls,
       pg_stat_statements.total_exec_time,
       pg_stat_statements.mean_exec_time
     FROM pg_stat_statements
     WHERE pg_stat_statements.mean_exec_time > threshold_ms
     ORDER BY pg_stat_statements.mean_exec_time DESC
     LIMIT 50;
   END;
   $$;
   ```

3. **Create Scheduled Job to Log Slow Queries:**
   ```typescript
   // app/api/cron/log-slow-queries/route.ts
   export async function GET(request: NextRequest) {
     const { data, error } = await supabaseAdmin.rpc('get_slow_queries', {
       threshold_ms: 1000,
     });

     if (data) {
       logger.warn('Slow queries detected', {
         context: { queries: data },
         tags: ['performance', 'database'],
       });
     }
   }
   ```

4. **Use Supabase Dashboard:**
   - Monitor database performance via Supabase Dashboard
   - Review query performance metrics
   - Analyze index usage

**Estimated Effort:** 2-3 hours

---

### 4. Security Audits: Automated Scanning

**Priority:** 🔴 **High** (Before Production)

**Current Gap:**
- No automated dependency vulnerability scanning
- No code security scanning
- No API security testing
- No automated RLS policy verification

**Recommended Solution:**
Implement automated security scanning using multiple tools.

**Benefits:**
- Automated vulnerability detection
- Code security scanning
- API security testing
- Continuous security monitoring

**Implementation Steps:**

1. **GitHub Dependabot** (Dependency Scanning):
   ```yaml
   # .github/dependabot.yml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       open-pull-requests-limit: 10
   ```

2. **Snyk Integration** (Code & Dependency Scanning):
   ```bash
   # Install Snyk CLI
   npm install -g snyk
   
   # Test dependencies
   snyk test
   
   # Monitor project
   snyk monitor
   ```

3. **Automated RLS Policy Tests:**
   ```typescript
   // tests/security/rls-policies.test.ts
   describe('RLS Policies', () => {
     it('should prevent cross-tenant data access', async () => {
       // Test tenant isolation
     });
   });
   ```

4. **GitHub Actions Security Workflow:**
   ```yaml
   # .github/workflows/security.yml
   name: Security Scan
   on:
     schedule:
       - cron: '0 0 * * 0' # Weekly
   jobs:
     security:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: snyk/actions/node@master
           env:
             SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
   ```

**Estimated Effort:** 3-4 hours

---

## Monitoring Dashboard Recommendations

### 1. Error Dashboard
- Error rate over time
- Error types breakdown
- Affected users
- Error trends

### 2. Performance Dashboard
- Core Web Vitals
- API response times
- Database query times
- Page load times

### 3. Security Dashboard
- Vulnerability count
- Security scan results
- Failed authentication attempts
- RLS policy violations

### 4. Database Dashboard
- Slow queries
- Connection pool usage
- Index usage
- Query performance trends

---

## Implementation Timeline

### Phase 1: Critical (Before Production)
- ✅ Error Tracking (Sentry) - 2-3 hours
- ✅ Security Audits (Dependabot + Snyk) - 3-4 hours

### Phase 2: Important (Post-Launch)
- ⚠️ Performance Monitoring - 3-4 hours
- ⚠️ Database Monitoring - 2-3 hours

**Total Estimated Effort:** 10-14 hours

---

## Environment Variables Needed

```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-auth-token

# Snyk
SNYK_TOKEN=your-snyk-token

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

---

## Success Metrics

- ✅ Error tracking: < 1% error rate
- ✅ Performance: LCP < 2.5s, FID < 100ms, CLS < 0.1
- ✅ Database: < 1% queries > 1s
- ✅ Security: 0 critical vulnerabilities

---

**Document Status:** 📋 **RECOMMENDATIONS PROVIDED**
