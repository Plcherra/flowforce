# Roles And Permissions Product Contract

Date: 2026-05-27

## Product Roles

FlowForce v1 uses four product roles:

- `owner`: full workspace ownership, billing, security, and recovery authority.
- `admin`: company administration, team setup, permission management, and operational oversight.
- `manager`: team, schedule, task, inventory, approval, and reporting access without system administration.
- `staff`: personal profile, own schedule, own tasks, and own expense visibility.

Legacy aliases are normalized into this model:

- `administrator` and `company_admin` become `admin`.
- `employee` becomes `staff`.
- `supervisor` becomes `manager`.

## Source Of Truth

The canonical contract lives in [productRoleContract.json](/Users/pedromartins/Documents/flowforce/src/features/roles/constants/productRoleContract.json).

The TypeScript helper layer in [productRoles.ts](/Users/pedromartins/Documents/flowforce/src/features/roles/constants/productRoles.ts) expands the owner wildcard into every registered permission from [registry.ts](/Users/pedromartins/Documents/flowforce/src/lib/permissions/registry.ts).

## Enforcement

Role assignment UI now writes the canonical role key to `profiles.role`, writes the selected `company_roles.id` to `profiles.role_id`, and keeps `company_members.role` aligned when a company membership exists.

Permission hooks normalize legacy role names before resolving permissions, so older tenants with `Administrator`, `Employee`, or `Supervisor` rows still map into the v1 role model.

## Route And Module Mapping

The contract maps sensitive product surfaces to at least one required permission:

- Role administration: `admin.roles`, `admin.permissions`, or `manageUsers`.
- Company settings: `admin.settings` or `systemSettings`.
- Manager scheduling actions: `editSchedules`, `schedule.edit`, or `approveTimeOff`.
- Inventory management: `inventory.edit`, `inventory.adjust`, or `manageInventory`.
- Billing and payments: `billing.view` or `managePayments`.
- AI governance: `ai.insights.view`, `ai.audit.view`, or `ai.governance.manage`.

## AI Governance Permissions

Plan 07 separates AI permissions from general analytics:

- `ai.insights.view`: view tenant-scoped AI guidance.
- `ai.actions.suggest`: ask AI to draft recommendations without product writes.
- `ai.actions.approve`: approve AI-originated writes.
- `ai.actions.automate`: enable pre-approved low-risk automation.
- `ai.audit.view`: review AI audit and governance status.
- `ai.governance.manage`: configure AI scopes, restricted modules, and automation level.

The older `viewAIInsights` permission remains as a compatibility alias for read-only insights.

The role matrix exposes the same four product roles and removes `supervisor` as a default product role.

## Verification

Run:

```bash
npm run check:roles
```

This confirms:

- The product role list is exactly owner, admin, manager, staff.
- Every referenced permission exists in the registered permission catalog.
- Owner expands to every registered permission.
- Admin includes role, permission, settings, user, and position management.
- Manager does not receive admin-only or billing-management permissions.
- Staff does not receive manager/admin-only permissions.
