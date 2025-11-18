# UI Refresh Plan

## Goals
- Make the core Communication area minimalist, square, and animated.
- Fold Help Desk into Messages as an on-demand function rather than a standalone page.
- Define a richer, more detailed Inventory system surface that still feels clean.
- Capture backend impacts required to support the refreshed UI.

## Communication Workspace
1. **Layout**
   - Three-column board (`channels` · `conversation` · `ops panel`) inside a centered max-width container with muted background.
   - Square, card-like surfaces using Tailwind `rounded-xl border bg-card` tokens.
   - Smooth transitions (Framer Motion) when switching columns, filters, or opening utilities.
2. **Channels Column**
   - Replace the free-resize layout with a fixed-width "Channel Grid" card.
   - Filters become pill buttons with icons (`All`, `Unread`, `Teams`, `Help Desk`).
   - Each channel block shows last activity glyphs, unread badge, and availability toggle.
3. **Conversation Column**
   - Frame `MessagesMainArea` inside a neutral card with condensed header, limited accent colors, and square composer.
   - Provide inline status chips for video calls and scheduled posts.
   - Keep current message actions but simplify color usage to monochrome + primary accent.
4. **Ops Panel (Right Column)**
   - Animated stack containing:
     - `HelpDeskPanel`: ticket list + quick create, slides in via Framer Motion.
     - `InventorySignalPanel`: pulls highlights from inventory (counts due, shortages) once backend wires exist.
     - `WorkflowShortcuts`: quick links to scheduling/approvals.
   - Panel collapses on mobile beneath conversation view using accordions.

## Help Desk Integration
- Add `helpDeskOpen` state to `useMessagesViewModel`.
- Provide `HelpDeskLauncher` button inside `MessagesHeader` + quick command (`⌘K` soon) to open.
- `HelpDeskPanel` uses existing `useTickets` hook and `useCommunicationBootstrap` context, but renders inline instead of separate route.
- The legacy `/app/help-desk` route will forward users to `/app/messages/helpdesk` while showing a minimal notice.

## Inventory Detail System
1. **InventoryLayout Update**
   - Wrap every inventory route inside a new `InventoryCommandLayout` that provides:
     - Square card header with location selector + date context.
     - Left "Structure" rail (nav + tags) and right "Detail Canvas" containing the route content.
   - Use subtle animation when changing sections.
2. **Detail Canvas Building Blocks**
   - `InventoryGrid` component renders matrix-style cards (Item Type × Location) with drill-downs.
   - `ActivityTimeline` and `ActionBar` components summarize recent movements and next steps.
3. **Data View Enhancements**
   - Immediate support uses placeholder demo data; hooks already return typed responses.
   - Plan to request aggregated endpoints for stock thresholds, PAR trends, waste grouping.

## Backend Impact Checklist
- **Help Desk inside Messages**
  - Need `/tickets` endpoints to support filtering by channel/team context for inline view.
  - Add mutation for "convert message → ticket" when launching from a conversation.
  - Ensure WebSocket push of ticket status to keep panel live.
- **Inventory Signals**
  - Aggregate counts per location + shortage alerts (new `inventory_signals` view or RPC).
  - Lightweight endpoint for "next actions" to feed the action bar.
  - Optionally expose activity stream for timeline (batched, paginated).
- **Channel Metadata**
  - Provide `channel.summary` payload (unread count, last activity, support SLA) so cards can stay minimal without extra queries.
- **Feature Flags**
  - Add `ui_refresh.communication` & `ui_refresh.inventory` toggles in config so backend can scope experiments.

## Next Steps
1. Implement refreshed `MessagesShell` layout + embedded Help Desk panel.
2. Update `InventoryLayout` and supporting components to the new square aesthetic.
3. Ship backend contract doc with the above checklist for API owners.
