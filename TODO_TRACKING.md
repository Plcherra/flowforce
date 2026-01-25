# TODO/FIXME Tracking System
**Date:** January 22, 2026  
**Status:** 📋 Infrastructure Ready

## Overview
This document tracks TODO and FIXME comments found across the codebase (94 files).

---

## Priority Categories

### 🔴 Critical (Fix Before Launch)
- Security vulnerabilities
- Data integrity issues
- Performance bottlenecks
- Broken functionality

### 🟡 High (Fix Soon)
- Code quality improvements
- Missing features
- Performance optimizations
- Technical debt

### 🟢 Medium (Nice to Have)
- Code refactoring
- Documentation improvements
- UI/UX enhancements
- Future features

---

## TODO/FIXME Inventory

### High Priority Files

#### `src/features/messages/hooks/useMessagesViewModel.ts`
- **Count:** Multiple TODOs
- **Priority:** 🟡 High
- **Category:** Feature improvements
- **Action:** Review and prioritize

#### `src/components/sections/CompanyUpdatesSection.tsx`
- **Count:** Incomplete implementations
- **Priority:** 🟡 High
- **Category:** Missing features
- **Action:** Complete implementations

#### `src/hooks/useTasks.tsx`
- **Count:** Performance optimizations needed
- **Priority:** 🟡 High
- **Category:** Performance
- **Action:** Optimize queries

---

## Tracking Format

```markdown
### File: `path/to/file.ts`
- **Line:** 123
- **Type:** TODO / FIXME
- **Priority:** 🔴 Critical / 🟡 High / 🟢 Medium
- **Category:** Security / Performance / Feature / Refactor
- **Description:** What needs to be done
- **Assignee:** (optional)
- **Status:** 📋 Pending / 🚧 In Progress / ✅ Complete
```

---

## Next Steps

1. **Audit All TODOs** (1-2 hours)
   - Scan all 94 files
   - Categorize by priority
   - Create detailed tracking entries

2. **Prioritize Critical Items** (30 minutes)
   - Identify blocking issues
   - Create tickets
   - Assign owners

3. **Create GitHub Issues** (1 hour)
   - Convert critical TODOs to issues
   - Link to code locations
   - Set milestones

---

## Automation

Consider using tools to track TODOs:
- ESLint plugin for TODO comments
- GitHub Actions to scan and create issues
- Custom script to generate this report

---

**Status:** Infrastructure ready, detailed audit pending
