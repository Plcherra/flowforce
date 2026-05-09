# Refactoring Strategy and Implementation Guide

## Overview

This document outlines the strategy for refactoring large files (>200 lines) into smaller, modular components (~100 lines each).

## Completed Refactorings

### Messages Feature ✅
- **MessagesShell.tsx**: Successfully split from 478 → 120 lines
- **AnimatedChannelWizard.tsx**: Successfully split from 711 → ~150 lines (wrapper)
- Created 8 new files with clear separation of concerns

## High-Priority Remaining Refactorings

### 1. Inventory Feature - Purchasing.tsx (2467 lines)

**Strategy:**
Split by tabs (4 main sections):
1. **Place Orders Tab** → `PurchaseOrderForm.tsx` (~400 lines)
2. **Receive Orders Tab** → `ReceiveOrdersPanel.tsx` (~300 lines)
3. **Order History Tab** → `PurchaseOrdersList.tsx` (~250 lines)
4. **Invoices Tab** → `VendorInvoicesPanel.tsx` (~300 lines)

**Extract:**
- Hooks: `usePurchaseOrderForm.ts`, `useReceiveOrders.ts`
- Components: `PurchaseOrderLineItems.tsx`, `OrderSummaryCard.tsx`
- Utils: Already extracted (formatting, statusHelpers)

**Implementation Steps:**
1. Extract each tab content into separate component files
2. Create hooks for form state management
3. Create shared components (line items table, summary cards)
4. Update main PurchasingPage to use tabs with extracted components

### 2. Forms Feature - FormFillDialog.tsx (1740 lines)

**Strategy:**
Split by wizard steps and field rendering:
1. **FormWizard.tsx** - Navigation and step management
2. **FormFieldRenderer.tsx** - Field rendering logic
3. **FormReviewView.tsx** - Review step
4. **useFormFill.ts** - Form state hook
5. **useFormFieldValues.ts** - Field values management

### 3. InventoryItemForm.tsx (1324 lines)

**Strategy:**
Split by form sections:
1. **ItemBasicInfo.tsx** - Name, description, category
2. **ItemPricing.tsx** - Cost, pricing rules
3. **ItemInventory.tsx** - Stock tracking, units
4. **ItemSuppliers.tsx** - Supplier management
5. **useInventoryItemForm.ts** - Form state hook

## Implementation Pattern

For each large file:

1. **Extract Utilities First**
   - Move helper functions to `utils/` folder
   - Move types to `types/` folder
   - Update imports

2. **Extract Hooks**
   - Move state management to custom hooks
   - Move data fetching logic to hooks
   - Keep hooks focused on single responsibility

3. **Split Components**
   - Identify logical sections (tabs, steps, panels)
   - Extract each section to separate component
   - Pass props down, keep components small

4. **Update Main Component**
   - Main component becomes orchestrator
   - Uses extracted components and hooks
   - Handles high-level state and routing

5. **Test Incrementally**
   - Verify each extraction doesn't break functionality
   - Run linter and type checker
   - Test user flows

## File Size Targets

- **Components**: 50-150 lines
- **Hooks**: 100-200 lines (can be longer if complex logic)
- **Utils**: 20-100 lines per utility file
- **Types**: As needed, but keep organized

## Next Actions

1. Continue with Inventory feature (Purchasing.tsx) - extract tab components
2. Refactor Forms feature (FormFillDialog.tsx)
3. Refactor remaining inventory components
4. Extract shared utilities across features
5. Migrate hooks to feature folders
6. Final verification and documentation
