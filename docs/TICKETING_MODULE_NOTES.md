Ticketing module foundation added (migrations, enums, models, permissions seed).

Tables
- ticket_main_categories, ticket_sub_categories, ticket_assets
- tickets (includes requestor snapshot: full name, branch, department, phone)
- ticket_status_history, ticket_assignments, ticket_activity_logs, ticket_notifications, ticket_ratings

Statuses & severity
- Status enum: pending_approval, approved, assigned, in_progress, pending, escalated, done, rejected, closed.
- Severity enum: severe, mid-severe, no-impact.
- Transition rules defined in App\Services\TicketStatusService.

Permissions
- Seeder: DatabaseSeeder calls TicketPermissionSeeder (role templates for Ticket User, Department Manager, Staff, Super Admin). Adjust role names/permissions to match production roles.

Next steps to make it functional
1) Controllers/Policies/FormRequests that use TicketStatusService to guard transitions and enforce required reasons. Snapshots should be filled from the authenticated user’s employee record during ticket creation.
2) Notification bell UI (DB backed) + event listeners to insert rows into ticket_notifications and broadcast.
3) React pages for create/list/detail with cascading Department → Main → Sub → Asset dropdowns, status badges, timeline from ticket_activity_logs, and 15-star rating UI after close.
4) Seeder data for categories/assets and mapping from employees to department managers (decide rule or add explicit mapping).
5) Tests for transition matrix, permission coverage, and required-reason validation.
