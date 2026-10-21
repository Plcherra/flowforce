# Schedule

This file is a manual review of each page, to decide what the final product will be from what we have now.

## Schedule grid and roles

Readiness is a good thing for leadership roles, but the current schedule page is very much a manager or leadership page. It has great insights, and it shows how to make the schedule, but we have to make a regular schedule page for everyone. For example, a coffee shop or an office business will not have all this access and information. How will the app tell those apart? How can we test that, since we do not have other users yet?

The grid looks decent, but shifts are somewhat transparent, and that does not help when planning a schedule for multiple roles. Imagine a schedule for 25, 50, 100, and 500 people. Multiple roles and stores? How does this feature fit in?

## View options, Actions, and Add layout

Most of the view-options features are broken:

- Minimized view does nothing.
- Role templates opens a drawer, but clicking the roles does nothing.

Copy from last week works. Save and load week template works too.

We have to change this:

- View options
- Actions
- Add

This is the same layout as the Connecteam app, and we have to differ from it: somehow have the same power to do the work, without copying that layout.

For example, copy last week is duplicated. It has a button beside Add first shift, and it is also inside the Actions button.

Week templates are also duplicated, in View options and in Actions.

Add is the same as the Add first shift button, but Add first shift is a "single shift" option of the Add button, which opens a drawer with multiple options. Can you suggest any plan for this layout to be original, but still have the same power to do all of that?

## Add shift wizard

We could add a way to load a shift template inside the Add shift wizard. The wizard has:

- Create New Shift
- Set up a new shift with detailed scheduling options.
- Details
- Users
- Tasks
- Notes

There is no way to easily load a shift template once the wizard window is open.

## My availability

The small drawer on the side is bad because it cuts off a lot of space.

The tab seems very complex, but it is beautiful.

We could use some options for availability:

- open = any day, any time

We could let the business choose whether a fixed or a flexible availability option is available for employees to choose. Fixed would be set up once the person is hired, set up on first onboarding, and then be available for sending a new availability.

The owner, or whoever the owner makes able to manage this, can choose which day the availability window starts, along with the schedule, with a simple way to change the start day and the end day. For example:

> "The schedule is done around Fri–Sat, posted on Saturday around 3–6pm. The posted schedule is from Sunday to Saturday (because it is posted on Saturday, so everyone has easy access to request time off). Also, the policy for time-off requests (will be a different feature, but interlinked like availability) has to be 7 days in advance. That's why it needs to be aligned with the schedule."

So for this business, it makes sense that an availability sent by an employee starts on the next available schedule. For example:

> "In this same scenario, I want to send a new availability, but today is already Saturday. Since the schedule is being posted today, I'm not able to change my availability for the next week, but the availability will fall, after it is reviewed, on the following week after the next Saturday."

The My availability tab has to have these features.

One thing we could change is the grid used to mark down availability. Instead of a checkmark, something like:

- Mon — all day on or off. If off, what time this person is available, "from x to y".
- Tue — ...
- Wed — ...

Is there any way to record unavailability or availability for people who can work "2 Sundays in the month" or "1 Saturday yes and the other not"?

## Team hours

The Team hours tab is very vague, and its features are not aligned with the app's needs.

Lock controls and per-person exceptions do not align with the plan.

The plan is that each user has their own role. Each role will have some standard permissions granted with the role, but those permissions are editable at any time.

Example: user "Amanda" is added.

Amanda is staff level, which by default includes seeing her schedule and her team's schedule on the grid, sending new availability hours for herself only, and more. On the invite, or even after the user has been set up, there has to be easy access on the invitation, with the role and the permissions, to check or activate, or to uncheck and deactivate, one of these permissions. Or, even while she is staff level, give her one of the manager permissions, such as seeing draft week/shifts, creating and assigning shifts, or even more permissions.

This has to be a matrix.

The Team hours tab is the tab that owners, or managers, or whoever controls and makes the schedule, have to manage. It can also be granted as a permission to read, edit, create, and grant to others.

This is the type of matrix this app will contain.

## My time off

This will correlate with the policy tab.

There can be multiple policies for time off, such as 1 weekend day per month, or x hours per year. Multiple policies can combine into one allowance.

## My swaps

My swaps is a good idea, but it is empty, and it is not linked or aligned with the rest of the project yet.

## Reminders

This also needs a difference between employees and managers who can assign reminders.

For example, me as John, a barista, can have some reminders. For example, "lists, forms, and tasks that I have access to, anything else assigned to me, and schedule-related things that I may need or have access to." This will be fully linked to the app, like "send the barista checklist -> click -> open the barista checklist".

There is also the tab dedicated to admins, owners, or managers. They will of course have their own personal reminders, but they will also assign reminders to the team, and grant or not grant permission to activate or to deactivate reminders.

For example, me, Pedro, as schedule maker or floor supervisor, has the permission to assign reminders, so I can assign John reminders to complete the bar checklist form around x time, on day x, x times. I can also make it available for John to deactivate it, or not available for him to deactivate it. This permission, to grant the permission to turn it on or off, is also part of the matrix. It can be granted to multiple people, and also taken away from people who have it.

## Team requests

The Team requests tab will show detailed information about the requests: time left, time requested, approved, rejected, and more. It will also be shown on the grid as a requested day off, and the person with the right permissions will manage it. That permission is part of the matrix.

## Decisions

## Phases

Owner will approve phases.

## Open questions

## Progress log
