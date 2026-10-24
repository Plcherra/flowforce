# Multi-location proposal

Pedro asked for this on 2026-10-23. Do not build it until he decides.

## What is wrong today

Company policies listed Stores, and the only chip was Walk-in. That name comes from `inv_locations`, the inventory count rooms (walk-in, freezer, dry storage). It is not a store.

There is no stores table. A policy store assignment was specified as `profiles.location_id`, and the schedule week grid can group by that same field. Inventory locations, profile locations, and shift `location` text are three different things.

The Stores control is hidden while a company has one store or none. Today every company is in that group.

## A later model

One `locations` row per place a company operates: id, company id, name, and timezone. A profile, a shift, and a policy assignment point at that id. Inventory count rooms stay on `inv_locations` and can optionally name the location they belong to.

## What it would touch

- Company policies: the Stores chips, and who a policy applies to.
- Schedule: the week grid group, shift location text, and `profiles.location_id`.
- Tasks and forms: nothing requires a store today. Weekday tasks already name a station inside one place.
- Inventory: count rooms stay separate from the place they sit in.
- Time off and availability: a policy can apply to one place without copying it onto each person.

## Not in this change

No new table, no migration, and no second place picker.
