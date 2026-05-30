# Webhooks And Public API

Date: 2026-05-30
Roadmap phase: 09.08 Webhooks And Public API

## Goal

FlowForce should be able to become a platform without exposing unsafe APIs. Public API keys, webhook subscriptions, event catalog, rate limits, delivery retries, and audit logs need to be explicit before external developer access.

09.08 defines the public platform foundation. It does not expose live public API routes yet.

## API Key Model

Public API keys are tenant-scoped and shown once. After creation, FlowForce stores only:

- Key id.
- Company id.
- Display name.
- Key prefix.
- Hashed secret.
- Scopes.
- Status.
- Creator.
- Created timestamp.
- Expiry timestamp.
- Last-used timestamp.

Raw API key secrets must never be stored in browser-readable settings, logs, or client-visible metadata.

The first API scopes are:

- `read:employees`
- `read:schedules`
- `read:inventory`
- `read:purchasing`
- `read:workflows`
- `write:webhook_events`

## Webhook Subscriptions

Webhook subscriptions are tenant-scoped and use server-side signing secret custody.

Subscription records include:

- Company id.
- Endpoint URL.
- Signing secret reference.
- Event keys.
- Status.
- Maximum attempts.
- Timeout seconds.

The delivery signature uses `x-flowforce-signature` and the timestamp header uses `x-flowforce-timestamp`.

## Event Catalog

The first webhook event catalog includes:

- `employee.created`
- `employee.updated`
- `schedule.published`
- `inventory.count.completed`
- `purchase_order.approved`
- `workflow.instance.completed`
- `incident.created`

Every event has a payload schema version, source tables, and retry behavior.

## Rate Limits And Retries

Public API requests use tenant API key limits. Webhook deliveries use delivery-specific limits.

The first limits are:

- Tenant public API: 600 requests per 60 seconds, with 100 burst requests, rejecting excess requests with 429.
- Webhook delivery: 1200 requests per 60 seconds, with 200 burst requests, pausing failing subscriptions when exceeded.

Webhook retries use 1, 5, 30, 120, and 720 minute backoff windows.

## Audit Actions

Public API and webhook audit actions are:

- `integration.public_api_key.created`
- `integration.public_api_key.used`
- `integration.public_api_key.revoked`
- `integration.webhook_subscription.created`
- `integration.webhook_delivery.attempted`
- `integration.webhook_delivery.failed`
- `integration.public_api.rate_limit_exceeded`

## Verification

09.08 is complete when:

- `npm run check:public-api-webhooks` passes.
- API key model is tenant-scoped, hashed, shown once, revocable, and expiring.
- Webhook subscriptions include event keys, signing secret custody, retries, and delivery logs.
- Event catalog covers employee, schedule, inventory, purchasing, workflow, and incident events.
- Rate limits and audit logs are defined.
- The system integration settings panel shows public API and webhook readiness.
