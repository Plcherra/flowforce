import { Link } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  MessageCircle,
  Settings,
  SquarePen,
  type LucideIcon,
} from "lucide-react";
import {
  getMobileQuickActionsForAudience,
  type MobileQuickActionId,
} from "@/services/mobile/mobileCoreWorkflows";

const mobileActionIcons: Record<MobileQuickActionId, LucideIcon> = {
  today_dashboard: ClipboardCheck,
  view_schedule: CalendarClock,
  open_tasks: ClipboardCheck,
  send_message: MessageCircle,
  fill_form: SquarePen,
  start_inventory_count: ClipboardList,
  profile_notifications: Settings,
  manager_create_task: ClipboardCheck,
  manager_review_schedule: CalendarClock,
  manager_open_reports: ClipboardList,
};

export function MobileCoreWorkflowActions() {
  const staffDashboardActionIds: MobileQuickActionId[] = [
    "view_schedule",
    "open_tasks",
    "send_message",
    "fill_form",
    "start_inventory_count",
    "profile_notifications",
  ];

  const actions = getMobileQuickActionsForAudience("staff").filter((action) =>
    staffDashboardActionIds.includes(action.id),
  );

  return (
    <section
      aria-label="Daily mobile actions"
      className="space-y-3"
      data-mobile-core-workflows="true"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Daily actions
          </h2>
          <p className="text-xs text-muted-foreground">
            Jump into the field workflows used most during a shift.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = mobileActionIcons[action.id];
          return (
            <Button
              key={action.id}
              asChild
              variant="outline"
              className="h-auto min-h-14 justify-start gap-2 px-3 py-3 text-left"
            >
              <Link
                to={action.route}
                aria-label={`${action.label}: ${action.description}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">
                    {action.label}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {action.description}
                  </span>
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
