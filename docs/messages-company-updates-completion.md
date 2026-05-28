# Messages And Company Updates Completion

Date: 2026-05-28

Purpose: define the pilot-ready communication surface for the authenticated web app.

## Product Rule

Teams must be able to communicate without leaving FlowForce:

- Channels and direct messages must load from tenant data.
- Read state must be visible through channel last-read tracking.
- Attachments must use private company-scoped storage paths.
- File previews must use signed URLs.
- Company updates must support publishing, scheduling, comments, reactions, and views.
- Managers must see communication and publishing readiness before launch.

## Messages Readiness Surface

The messages workspace now includes a communication readiness panel with these signals:

- Total channels.
- Team and direct channel counts.
- Help desk channels.
- Private channels.
- Unread channels.
- Inactive channels.
- Current-channel attachment usage.

The panel links managers directly to channel creation and announcement creation.

## Company Updates Readiness Surface

The company updates page now includes an update readiness panel with these signals:

- Published updates.
- Draft updates.
- Scheduled updates.
- High-priority updates.
- Unviewed updates.
- Updates with no engagement.
- Updates scoped to assigned audiences.

The panel highlights scheduled updates without a future scheduled date, draft updates awaiting publish, and published updates with no engagement.

## Storage And Read Safety

Message attachments continue to use the private `message-attachments` bucket with company-scoped paths. Preview opens through signed storage URLs, and downloads use Supabase storage APIs rather than public bucket links.

## Deferred

Later phases should add:

- Production push/email notification delivery.
- Rich read receipts per message, not just channel last-read.
- Scheduled message persistence if pilot users need delayed sends.
- Delivery analytics and acknowledgement requirements for mandatory updates.
