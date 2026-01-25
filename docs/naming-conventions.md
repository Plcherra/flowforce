# Naming Conventions Guide

## Overview

This document outlines the naming conventions used in the FlowForce codebase. ESLint rules enforce these conventions to maintain consistency.

---

## TypeScript/JavaScript Naming Rules

### Variables and Functions
- **camelCase** for variables and functions
- **PascalCase** for React components and classes
- **UPPER_CASE** for constants

**Examples:**
```typescript
// Variables - camelCase
const userName = 'John';
const isActive = true;
const fetchData = async () => {};

// Components - PascalCase
function UserProfile() {}
class DataService {}

// Constants - UPPER_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';
```

### Types and Interfaces
- **PascalCase** for types, interfaces, and type aliases

**Examples:**
```typescript
type UserProfile = { name: string };
interface TaskData { id: string; }
type TaskStatus = 'todo' | 'in_progress' | 'completed';
```

### Leading Underscores
- Allowed for unused parameters or private members
- Pattern: `^_` (e.g., `_unused`, `_private`)

**Examples:**
```typescript
function processData(_unusedParam: string, activeParam: number) {}
class Service {
  private _internalState: string;
}
```

---

## Database Naming Conventions

### Tables and Columns
- **snake_case** for database tables and columns
- This matches PostgreSQL conventions

**Examples:**
```sql
-- Tables
CREATE TABLE user_profiles (...);
CREATE TABLE time_off_requests (...);

-- Columns
user_id, company_id, created_at, updated_at
```

### TypeScript Mapping
- Database `snake_case` is mapped to TypeScript `camelCase` in application code

**Examples:**
```typescript
// Database: user_id, company_id
// TypeScript:
interface Profile {
  userId: string;      // Maps from user_id
  companyId: string;   // Maps from company_id
  createdAt: string;   // Maps from created_at
}
```

---

## File Naming Conventions

### Components
- **PascalCase** for React components
- Match component name to file name

**Examples:**
- `UserProfile.tsx` → `function UserProfile() {}`
- `TaskDetailsDialog.tsx` → `function TaskDetailsDialog() {}`

### Hooks
- **camelCase** starting with `use`
- Match hook name to file name

**Examples:**
- `useAuth.tsx` → `export function useAuth() {}`
- `useTasks.tsx` → `export function useTasks() {}`
- `useDashboardData.tsx` → `export function useDashboardData() {}`

### Utilities and Services
- **camelCase** for utility functions
- **PascalCase** for service classes

**Examples:**
- `logger.ts` → `export function createLogger() {}`
- `retry.ts` → `export function retryWithBackoff() {}`
- `AnalyticsService.ts` → `class AnalyticsService {}`

### Repositories
- **camelCase** ending with `Repository`
- Match repository name to file name

**Examples:**
- `tasksRepository.ts` → `export const tasksRepository = { ... }`
- `messagesRepository.ts` → `export const messagesRepository = { ... }`

---

## Common Patterns

### Query Hooks
- Pattern: `use[Entity]` or `use[Entity]Data`
- Examples: `useTasks`, `useEmployees`, `useDashboardData`

### Mutation Hooks
- Pattern: `use[Entity]Mutations` or `use[Action][Entity]`
- Examples: `useTaskMutations`, `useCreateTask`, `useUpdateTask`

### Repository Functions
- Pattern: `[action][Entity]` or `[action][Entity][Qualifier]`
- Examples: `fetchTasksByCompany`, `insertTask`, `updateTaskRow`, `deleteTaskRow`

### Service Functions
- Pattern: `[action][Entity]` or `[action][Qualifier]`
- Examples: `fetchAnalytics`, `calculateMetrics`, `processData`

---

## ESLint Configuration

The following ESLint rules enforce naming conventions:

```json
{
  "@typescript-eslint/naming-convention": [
    "warn",
    {
      "selector": "variable",
      "format": ["camelCase", "PascalCase", "UPPER_CASE"],
      "leadingUnderscore": "allow"
    },
    {
      "selector": "function",
      "format": ["camelCase", "PascalCase"]
    },
    {
      "selector": "typeLike",
      "format": ["PascalCase"]
    }
  ]
}
```

---

## Migration Notes

### Current State
- Most code follows conventions
- Some inconsistencies exist (documented below)

### Known Inconsistencies
1. **Database columns**: Some use `snake_case` in TypeScript (acceptable for direct DB mapping)
2. **Legacy code**: Some older files may not follow conventions

### Migration Strategy
1. Fix naming in new code
2. Fix naming when refactoring existing code
3. Document exceptions when necessary

---

## Best Practices

1. **Be Consistent**: Use the same naming pattern throughout a file/module
2. **Be Descriptive**: Names should clearly indicate purpose
3. **Follow Conventions**: Stick to established patterns
4. **Update ESLint**: Add exceptions only when necessary

---

## Examples

### ✅ Good Naming
```typescript
// Variables
const userName = 'John';
const isUserActive = true;
const MAX_RETRIES = 3;

// Functions
function fetchUserData() {}
function calculateTotal() {}

// Components
function UserProfile() {}
function TaskDetailsDialog() {}

// Types
type UserProfile = { name: string };
interface TaskData { id: string; }
```

### ❌ Bad Naming
```typescript
// Variables - inconsistent case
const UserName = 'John';  // Should be camelCase
const is_user_active = true;  // Should be camelCase

// Functions - inconsistent case
function FetchUserData() {}  // Should be camelCase
function calculate_total() {}  // Should be camelCase

// Types - wrong case
type userProfile = { name: string };  // Should be PascalCase
```

---

## See Also

- `.eslintrc.json` - ESLint configuration
- `src/hooks/shared/` - Shared query utilities
- `src/repositories/` - Repository pattern examples
