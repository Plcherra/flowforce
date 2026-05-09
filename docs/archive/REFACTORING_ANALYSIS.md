# Refactoring Analysis Report

## Phase 1: File Size Analysis

### Files >200 Lines (Excluding Tests and Auto-generated)

Generated: $(date)

### Summary by Category

#### Inventory Feature (src/features/inventory/)
- **Purchasing.tsx** (2467 lines) - Main purchasing component
- **InventoryItemForm.tsx** (1324 lines) - Item form
- **InventoryTransfersPanel.tsx** (1187 lines) - Transfers panel
- **NewCountWizard.tsx** (840 lines) - Count wizard
- **inventoryService.ts** (866 lines) - Inventory service
- **Actions.tsx** (721 lines) - Inventory actions route
- **CountDetail.tsx** (647 lines) - Count detail route
- **countsRepository.ts** (709 lines) - Counts repository

#### Forms Feature (src/features/forms/ or src/components/forms/)
- **FormFillDialog.tsx** (1740 lines) - Form filling dialog
- **FieldEditor.tsx** (929 lines) - Form field editor
- **FormAnalytics.tsx** (699 lines) - Form analytics

#### Admin/User Management
- **UserManagement.tsx** (1596 lines) - User management component
- **InviteEmployeesModal.tsx** (922 lines) - Employee invitation modal

#### Scheduling Feature
- **SchedulingContext.tsx** (982 lines) - Scheduling context
- **DragDropScheduleCalendar.tsx** (1156 lines) - Calendar component
- **NextGenSchedulingSystem.tsx** (859 lines) - Scheduling system
- **autoScheduler.ts** (806 lines) - Auto scheduling service

#### Employees/HR Feature
- **TeamDirectory.tsx** (1119 lines) - Team directory
- **InviteEmployeesModal.tsx** (922 lines) - Employee invitation modal

#### Messages Feature
- **AnimatedChannelWizard.tsx** (711 lines) - Channel wizard
- **MessagesShell.tsx** (478 lines) - Messages shell

#### Roles/Permissions
- **SectionPermissionsTab.tsx** (1157 lines) - Permissions tab

#### Reports/Analytics
- **ReportsAnalyzer.tsx** (834 lines) - Reports analyzer
- **InteractiveKpiTiles.tsx** (1003 lines) - KPI tiles
- **businessAnalyticsService.ts** (773 lines) - Analytics service

#### Tasks/Goals
- **Tasks.tsx** (770 lines) - Tasks screen

#### Services
- **learningService.ts** (1074 lines) - Learning service
- **performanceService.ts** (798 lines) - Performance service
- **closedLoopEngine.ts** (840 lines) - Closed loop engine
- **autoScheduler.ts** (806 lines) - Auto scheduler

#### Hooks (to be migrated)
- **useFinancialManagement.ts** (792 lines) - Financial management
- **useEvents.tsx** (791 lines) - Calendar events
- **useAIActionsFeed.ts** (709 lines) - AI actions feed
- **useLearningCenter.ts** (691 lines) - Learning center

#### Other Components
- **sidebar.tsx** (822 lines) - Main sidebar
- **AvailabilityRequestForm.tsx** (778 lines) - Availability form
- **PositionManagement.tsx** (1030 lines) - Position management
- **recognitionRepository.ts** (1027 lines) - Recognition repository

## Extraction Opportunities

### 1. Utility Functions to Extract
- Currency formatting (`formatCurrency`) - Found in Purchasing.tsx
- Date formatting (`formatDate`) - Found in multiple files
- Status helpers (`getStatusColor`, `getStatusIcon`) - Found in Purchasing.tsx
- Field grouping logic - Found in FormFillDialog.tsx
- Field formatting - Found in FormFillDialog.tsx

### 2. Hooks to Extract
- Purchase orders logic from Purchasing.tsx
- Vendor invoices logic from Purchasing.tsx
- Supplier integrations logic from Purchasing.tsx
- Form filling state from FormFillDialog.tsx
- Field values management from FormFillDialog.tsx
- Field editor state from FieldEditor.tsx
- Inventory transfers logic from InventoryTransfersPanel.tsx
- Count wizard state from NewCountWizard.tsx
- Channel wizard state from AnimatedChannelWizard.tsx
- Scheduling mutations from SchedulingContext.tsx
- Scheduling queries from SchedulingContext.tsx
- Calendar state from DragDropScheduleCalendar.tsx
- Drag-drop logic from DragDropScheduleCalendar.tsx
- Team directory logic from TeamDirectory.tsx
- Invite employees logic from InviteEmployeesModal.tsx
- User management logic from UserManagement.tsx
- Task filters from Tasks.tsx
- Task mutations from Tasks.tsx
- Permissions logic from SectionPermissionsTab.tsx

### 3. Sub-components to Extract
- Purchase orders list/table
- Purchase order form
- Purchase order details
- Vendor invoices list
- Vendor invoice form
- Integration dialog
- Item form sections (basic info, pricing, inventory, categories, suppliers)
- Transfer list
- Transfer form
- Transfer details
- Count wizard steps (setup, items, review)
- Form wizard navigation
- Form field renderer
- Form review view
- Field type selector
- Field config panel
- Field validation editor
- Field conditional logic
- Report upload
- Report list
- Report viewer
- Report insights
- KPI tile
- KPI chart
- KPI filters
- Calendar week view
- Calendar day view
- Shift card
- Calendar toolbar
- Schedule builder
- Schedule optimizer
- Employee card
- Employee list
- Employee filters
- Employee search
- Invite form
- Invite bulk upload
- Invite preview
- User list
- User details
- User roles editor
- User permissions
- Copilot insights
- Task list
- Task card
- Task filters
- Task details dialog
- Permission matrix
- Role selector
- Permission editor

## Feature Organization Map

### Target Structure

```
src/
├── features/
│   ├── inventory/
│   │   ├── components/
│   │   │   ├── purchasing/
│   │   │   ├── items/
│   │   │   ├── transfers/
│   │   │   └── counts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── forms/
│   │   ├── components/
│   │   │   ├── fill/
│   │   │   └── builder/
│   │   ├── hooks/
│   │   └── utils/
│   ├── messages/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── wizard/
│   │   └── hooks/
│   ├── scheduling/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── services/
│   ├── employees/
│   │   ├── components/
│   │   │   └── modals/
│   │   └── hooks/
│   ├── admin/
│   │   └── components/
│   │       └── user-management/
│   ├── tasks/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── roles/
│   │   └── components/
│   │       └── permissions/
│   ├── reports/
│   │   ├── components/
│   │   └── hooks/
│   ├── analytics/
│   │   ├── components/
│   │   └── services/
│   ├── calendar/
│   │   └── hooks/
│   ├── finance/
│   │   ├── hooks/
│   │   └── pages/
│   ├── ai/
│   │   └── hooks/
│   └── learning/
│       └── hooks/
├── shared/
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   ├── currencyHelpers.ts
│   │   ├── statusHelpers.ts
│   │   └── validationHelpers.ts
│   └── hooks/
└── components/ (global UI components only)
```

## Next Steps

1. Begin Phase 2 refactoring with highest-impact files
2. Start with Messages feature (smaller, well-structured)
3. Move to Inventory feature (largest files)
4. Continue with Forms, then other features
5. Extract shared utilities as patterns emerge
