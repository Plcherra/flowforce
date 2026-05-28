# 04.06 Messages And Company Updates Completion

Date: 2026-05-28

## Status

Completed.

## What Changed

- Added a communication readiness panel to the messages workspace.
- Added message review signals for unread channels, inactive channels, private channels, help desk routing, and current-channel attachments.
- Added manager actions for channel creation and announcement creation from the readiness panel.
- Added an update readiness panel to the company updates page.
- Added update review signals for drafts, scheduled updates, high-priority posts, unviewed updates, scoped audiences, and no-engagement posts.
- Confirmed message attachment flow uses company-scoped private storage paths and signed preview URLs.
- Tightened touched messages/company-updates files so targeted ESLint runs without warnings.

## Data Sources

The communication readiness surfaces read:

- `message_channels`
- `channel_members`
- `messages`
- `company_updates`
- `company_update_reactions`
- `company_update_comments`
- `company_update_engagement`

## Acceptance Check

Teams can communicate without leaving FlowForce:

- Users can use channels and direct messages.
- Channel read state is visible through unread readiness.
- Attachments remain scoped to private storage.
- Managers can create updates and announcements.
- Published updates support views, likes, comments, and engagement readiness.
- Draft and scheduled updates are visible as publishing work.

## Verification

- `npm run typecheck`
- Targeted messages/company-updates ESLint pass with `--max-warnings=0`

## Follow-Up For Later Phases

- Add production email/mobile notification delivery.
- Add message-level read receipts and required acknowledgements.
- Persist scheduled messages if delayed sends become a v1 requirement.
- Add deeper delivery and acknowledgement analytics.
