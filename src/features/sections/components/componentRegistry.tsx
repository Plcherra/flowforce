import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompanyUpdates } from "@/hooks/useCompanyUpdates";
import { useCompanyUpdateMutations } from "@/features/company-updates/hooks/useCompanyUpdateMutations";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useEmployees } from "@/hooks/useEmployees";
import { useEvents } from "@/hooks/useEvents";
import { formatDistanceToNow } from "date-fns";
import type {
  CustomSection,
  CustomSectionPage,
} from "@/hooks/useCustomSections";

export interface SectionComponentProps {
  section: CustomSection;
  page: CustomSectionPage;
  config?: Record<string, unknown>;
}

export interface SectionComponentDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "communication" | "operations" | "hr" | "custom";
  render: (props: SectionComponentProps) => JSX.Element;
}

function UpdatesFeedComponent() {
  const { updates, loading } = useCompanyUpdates();
  const { toggleLike } = useCompanyUpdateMutations();
  const displayed = useMemo(() => updates.slice(0, 5), [updates]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading updates...</div>
    );
  }

  if (displayed.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No updates yet</CardTitle>
          <CardDescription>
            Publish your first update to keep everyone in the loop.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {displayed.map((update) => (
        <Card key={update.id} className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {update.title}
              </CardTitle>
              <Badge variant={update.isPinned ? "default" : "secondary"}>
                {update.isPinned ? "Pinned" : "Update"}
              </Badge>
            </div>
            {update.createdAt && (
              <CardDescription>
                {formatDistanceToNow(new Date(update.createdAt), {
                  addSuffix: true,
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <p className="text-sm text-muted-foreground leading-snug">
              {update.body?.slice(0, 180) || "No content provided yet."}
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void toggleLike({
                    updateId: update.id,
                    currentlyLiked: update.viewerHasLiked,
                  })
                }
              >
                👍 {update.likes ?? 0}
              </Button>
              <span className="text-xs text-muted-foreground">
                {update.comments ?? 0} comments • {update.views ?? 0} views
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnnouncementsBoardComponent() {
  const { announcements, loading } = useAnnouncements();

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading announcements...
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No announcements</CardTitle>
          <CardDescription>
            Publish announcements to highlight critical updates.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.slice(0, 5).map((announcement) => (
        <Card key={announcement.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                {announcement.title}
              </CardTitle>
              <Badge variant={announcement.is_read ? "outline" : "default"}>
                {announcement.priority}
              </Badge>
            </div>
            <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
              <span>
                {announcement.creatorprofile?.first_name}{" "}
                {announcement.creatorprofile?.last_name}
              </span>
              {announcement.created_at && (
                <span>
                  •{" "}
                  {formatDistanceToNow(new Date(announcement.created_at), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground leading-snug">
              {announcement.content?.slice(0, 220) ||
                "No description provided."}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmployeeDirectoryComponent() {
  const { employees = [], loading } = useEmployees();

  const topEmployees = useMemo(() => employees.slice(0, 8), [employees]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading employees...</div>
    );
  }

  if (topEmployees.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No employees found</CardTitle>
          <CardDescription>
            Add team members to start building your directory.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Team Directory</CardTitle>
        <CardDescription>
          Quick access to recently added teammates.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topEmployees.map((employee) => (
            <div
              key={employee.id}
              className="border rounded-lg p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {employee.fullName ||
                    `${employee.firstName} ${employee.lastName}`}
                </span>
                {employee.position && (
                  <Badge variant="secondary" className="text-xs">
                    {employee.position}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col text-xs text-muted-foreground gap-1">
                {employee.email && <span>{employee.email}</span>}
                {employee.phone && <span>{employee.phone}</span>}
                {employee.department && <span>{employee.department}</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EventsSnapshotComponent() {
  const { events, loading } = useEvents();
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => Date.parse(event.start) >= Date.now())
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
        .slice(0, 6),
    [events],
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading events...</div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No upcoming events</CardTitle>
          <CardDescription>
            Schedule an event to see it appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Upcoming Events</CardTitle>
        <CardDescription>Next on the calendar for your team.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-72">
          <div className="space-y-3 pr-2">
            {upcoming.map((event) => (
              <div key={event.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{event.title}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {event.type || "event"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                  <span>{new Date(event.start).toLocaleString()}</span>
                  {event.location && <span>• {event.location}</span>}
                </div>
                {event.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const SECTION_COMPONENTS: SectionComponentDefinition[] = [
  {
    id: "feed",
    label: "Company Updates Feed",
    description:
      "Interactive feed of company updates with reactions and engagement.",
    icon: "Megaphone",
    category: "communication",
    render: () => <UpdatesFeedComponent />,
  },
  {
    id: "announcements",
    label: "Announcements Board",
    description: "Prioritized announcements with read status tracking.",
    icon: "Bell",
    category: "communication",
    render: () => <AnnouncementsBoardComponent />,
  },
  {
    id: "directory",
    label: "Employee Directory",
    description: "Quick contacts and roles for your teammates.",
    icon: "Users",
    category: "hr",
    render: () => <EmployeeDirectoryComponent />,
  },
  {
    id: "events",
    label: "Events Snapshot",
    description: "Upcoming meetings and schedule highlights.",
    icon: "Calendar",
    category: "operations",
    render: () => <EventsSnapshotComponent />,
  },
];

export const listSectionComponents = () => SECTION_COMPONENTS;

export const getSectionComponent = (id?: string | null) =>
  SECTION_COMPONENTS.find((component) => component.id === id);
