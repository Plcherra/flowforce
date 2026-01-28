import { useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowUpRight, CheckCircle2, Inbox, XCircle } from "lucide-react";

import { hoursDelta } from "@/availability/availabilityUtils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { cn } from "@/lib/utils";

import type { AvailabilityEmployee, ManagerAvailabilityRequest } from "./types";

dayjs.extend(relativeTime);

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface RequestsQueueProps {
  requests: ManagerAvailabilityRequest[];
  employees: AvailabilityEmployee[];
  onApprove: (request: ManagerAvailabilityRequest) => void;
  onDeny: (request: ManagerAvailabilityRequest, note: string) => void;
  mutationPending: boolean;
  isLoading: boolean;
}

export function RequestsQueue({
  requests,
  employees,
  onApprove,
  onDeny,
  mutationPending,
  isLoading,
}: RequestsQueueProps) {
  return (
    <Card className="border bg-background shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Requests queue
        </CardTitle>
        <CardDescription>
          Review and manage availability change requests from employees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-8">
            <LoadingSpinner text="Loading requests..." />
          </div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-3">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="denied">Denied</TabsTrigger>
            </TabsList>
            {(["pending", "approved", "denied"] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                <RequestsTable
                  tab={tab}
                  requests={requests}
                  employees={employees}
                  onApprove={onApprove}
                  onDeny={onDeny}
                  pending={mutationPending}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
        {!isLoading && requests.length === 0 && (
          <EmptyState
            title="No availability requests yet"
            description="As soon as someone submits a change, it will land here for review."
          />
        )}
      </CardContent>
    </Card>
  );
}

function RequestsTable({
  tab,
  requests,
  employees,
  onApprove,
  onDeny,
  pending,
}: {
  tab: "pending" | "approved" | "denied";
  requests: ManagerAvailabilityRequest[];
  employees: AvailabilityEmployee[];
  onApprove: (request: ManagerAvailabilityRequest) => void;
  onDeny: (request: ManagerAvailabilityRequest, note: string) => void;
  pending: boolean;
}) {
  const filtered = useMemo(
    () => requests.filter((request) => request.status === tab),
    [requests, tab],
  );

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={`No ${tab} requests`}
        description={
          tab === "pending"
            ? "Pending requests will appear here when employees submit changes."
            : `Nothing in the ${tab} queue right now.`
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          employees={employees}
          onApprove={onApprove}
          onDeny={onDeny}
          pending={pending}
        />
      ))}
    </div>
  );
}

function RequestRow({
  request,
  employees,
  onApprove,
  onDeny,
  pending,
}: {
  request: ManagerAvailabilityRequest;
  employees: AvailabilityEmployee[];
  onApprove: (request: ManagerAvailabilityRequest) => void;
  onDeny: (request: ManagerAvailabilityRequest, note: string) => void;
  pending: boolean;
}) {
  const [denialNote, setDenialNote] = useState("");
  const employeeLabel = useMemo(() => {
    const match = employees.find(
      (employee) => employee.id === request.employeeId,
    );
    if (match) return match;
    return {
      id: request.employeeId,
      first_name: request.employeeName,
      last_name: "",
    };
  }, [employees, request.employeeId, request.employeeName]);

  const diff = useMemo(() => {
    const lines: { day: string; added: number[]; removed: number[] }[] = [];
    DAY_LABELS.forEach((label, index) => {
      const original = new Set(request.originalAvailability[index] ?? []);
      const desired = new Set(request.desiredAvailability[index] ?? []);
      const added = Array.from(desired).filter((hour) => !original.has(hour));
      const removed = Array.from(original).filter((hour) => !desired.has(hour));
      if (added.length || removed.length) {
        lines.push({ day: label, added, removed });
      }
    });
    return lines;
  }, [request]);

  const hoursDiff = hoursDelta(
    request.originalAvailability,
    request.desiredAvailability,
  );

  return (
    <div className="rounded-lg border p-4 shadow-sm transition hover:border-primary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            {`${employeeLabel.first_name ?? ""} ${employeeLabel.last_name ?? ""}`.trim() ||
              request.employeeName}
          </h3>
          <p className="text-xs text-muted-foreground">
            Week of {dayjs(request.weekStart).format("MMM D, YYYY")} · Submitted{" "}
            {dayjs(request.createdAt).fromNow()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-xs uppercase"
          >
            Impact score: {request.impactScore}
          </Badge>
          <Badge
            variant={
              request.status === "approved"
                ? "default"
                : request.status === "denied"
                  ? "destructive"
                  : "secondary"
            }
          >
            {request.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 py-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Requested changes
          </p>
          <div className="mt-2 space-y-2 text-xs">
            {diff.map((entry) => (
              <div key={entry.day} className="flex items-center gap-2">
                <span className="w-16 font-medium">{entry.day}</span>
                {entry.added.length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    {entry.added
                      .map((hour) => dayjs().hour(hour).format("h A"))
                      .join(", ")}
                  </span>
                )}
                {entry.removed.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-3 w-3" />
                    {entry.removed
                      .map((hour) => dayjs().hour(hour).format("h A"))
                      .join(", ")}
                  </span>
                )}
              </div>
            ))}
            {diff.length === 0 && <p>No hour-level changes detected.</p>}
          </div>
        </div>
        <div className="rounded-md border bg-muted/40 p-3 text-xs">
          <p className="font-semibold text-muted-foreground">Request details</p>
          <dl className="mt-2 space-y-2">
            <div className="flex justify-between">
              <dt>Range</dt>
              <dd className="text-muted-foreground">
                {dayjs(request.requestedRange.start).format("MMM D")} –{" "}
                {dayjs(request.requestedRange.end).format("MMM D")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Hour delta</dt>
              <dd
                className={cn(
                  hoursDiff >= 0 ? "text-emerald-600" : "text-destructive",
                )}
              >
                {hoursDiff >= 0 ? "+" : ""}
                {hoursDiff} hrs
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Reason</dt>
              <dd className="text-muted-foreground">{request.reason || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {request.status === "pending" ? (
        <div className="flex flex-col gap-3 border-t pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>
              Approve to apply changes immediately and grant a temporary
              exception. Deny to notify the employee.
            </p>
            <Textarea
              placeholder="Optional note when denying..."
              value={denialNote}
              onChange={(event) => setDenialNote(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onDeny(request, denialNote)}
              disabled={pending}
            >
              Deny
            </Button>
            <Button onClick={() => onApprove(request)} disabled={pending}>
              Approve
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            {request.status === "approved" ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Approved by {request.managerId ?? "manager"}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" />
                Denied by {request.managerId ?? "manager"}
              </span>
            )}
          </span>
          {request.decisionNote && (
            <span className="text-xs text-muted-foreground">
              Note: {request.decisionNote}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-muted-foreground/50 bg-muted/10 px-6 py-10 text-center text-muted-foreground">
      <Inbox className="h-6 w-6 text-muted-foreground/80" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs">{description}</p>
      </div>
    </div>
  );
}
