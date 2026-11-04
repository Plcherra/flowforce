# Feature access matrix

Depends on PR #20 (`cursor/rls-permission-matrix-62c0`), which added `current_user_has_permission`. This change does not apply the migration to production.

Levels are the product roles: owner, admin, manager, staff. Owner holds every key. A class pack or a per-person allow/deny still wins over the default, the same way `useCan` does. Positions and departments do not grant a second permission list. They only match the person to a class.

`Yes` means the level has the key by default. `Own` means the row must belong to the signed-in person. `Grant` means the key is off by default and an owner can turn it on for that person.

## Decisions for Pedro

- Staff no longer read other people's form submissions by default. The key `forms.submissions.read` stays grantable for a person who should.
- A manager can publish company updates. Everyone in the company can read a published update, like it, and comment as themselves. Drafts and scheduled updates stay with the author and with `updates.manage`.
- Messages are visible only to channel members. `messages.manage` can edit a channel and delete someone else's message. It does not open a conversation the manager is not in.
- Staff request their own time off and cannot approve it. Approval is `approveTimeOff`. The request reason is not visible to someone who can only see the team schedule.
- Staff see their own performance review. Managers see and write the team's reviews. The review row stores `employee_id` for that split.
- Documents have no per-person owner column, so `documents.view` is the whole company library and `documents.manage` uploads and deletes.
- Company goals are visible to the company. Creating or deleting them is `goals.manage`. A person can update a goal they created.
- Workflow evidence is the worker's own capture. Reviews, exception handling, and assignments are manager keys. A worker can still file an open exception on their own work.
- `inv_*` inventory uses the inventory keys that already exist. Staff do not hold those keys, so they cannot read or write the inventory tables. `inv_units` stays a shared unit list that any signed-in person can read. Writing a unit needs inventory edit.
- Own availability (`user_unavailability`) stays editable by the person. Editing someone else's availability needs schedule edit.

## Matrix

| Feature | Staff | Manager | Admin | Notes |
| --- | --- | --- | --- | --- |
| Forms: see published | Yes | Yes | Yes | Drafts: author, or `createForms` / `manageForms` |
| Forms: submit own | Yes `forms.submit` | Yes | Yes | `submitted_by` must be the signed-in person |
| Forms: read others' submissions | Grant `forms.submissions.read` | Yes | Yes | Also `approveFormSubmissions` or `manageForms` |
| Forms: create template | No | Yes `createForms` | Yes | |
| Forms: edit or delete template | No | Edit with `createForms`. Delete template is `manageForms` | Yes | Replacing fields deletes the old field rows with `createForms` or `manageForms` |
| Forms: approve submission | No | Yes `approveFormSubmissions` | Yes | |
| Messages: read | Participants | Participants | Participants | Not the rest of the company |
| Messages: send and start a channel | Yes `messages.send` | Yes | Yes | Can add coworkers only to a channel you created. A member can update their own read marker. Changing the channel needs `messages.manage` |
| Messages: manage channels and others' messages | No | Yes `messages.manage` | Yes | Does not reveal non-member threads |
| Goals: view | Yes `goals.view` | Yes | Yes | |
| Goals: create, edit, delete | No | Yes `goals.manage` | Yes | Creator with `goals.view` may update their goal |
| Company updates: read published, like, comment | Yes | Yes | Yes | Comment and like as yourself |
| Company updates: publish, edit, delete | No | Yes `updates.manage` | Yes | Settings keys still count, as they do in the app today |
| Documents: view | Yes `documents.view` | Yes | Yes | Company library |
| Documents: upload, edit, delete | No | Yes `documents.manage` | Yes | Reports upload button follows this key |
| Reviews: view | Own `reviews.view_own` | Team `reviews.manage` | Team | |
| Reviews: create, edit, delete | No | Yes `reviews.manage` | Yes | |
| Time off: request own | Yes `timeoff.request` | Yes | Yes | Cannot set the status to approved |
| Time off: see others and approve | No | Yes `approveTimeOff` | Yes | |
| Availability: edit own | Yes | Yes | Yes | |
| Availability: edit others | No | Yes schedule edit | Yes | |
| Workflow evidence | Own `workflow.evidence` | Yes, and `workflow.review` reads the team | Yes | |
| Workflow reviews | No | Yes `workflow.review` | Yes | |
| Workflow exceptions | File own open exception | Yes `workflow.exceptions` | Yes | |
| Workflow assignments | Read | Yes `workflow.assign` | Yes | Read is anyone who can see their own tasks |
| Inventory `inv_*`: view and write | No | Existing inventory keys | Existing inventory keys | Counts, waste, prep, and purchasing stay on their own keys |
| Inventory units | Read | Read, edit with inventory edit | Read, edit | Shared catalog |

The role matrix screen lists each new key on its own switch: Submit forms, Messages, Goals, Company updates, Documents, Performance reviews, Time off request, and the four workflow rows. Inventory keeps the switches it already had.
