import { addDays, format, startOfWeek } from "date-fns";
import type {
  AssignmentWithUser,
  ProfileSummary,
  ShiftWithAssignments,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventWithMetadata,
} from "./types";
import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";

interface BuildFallbackParams {
  start?: string;
}

const COMPANY_ID = "demo-company";
const CREATOR_ID = "demo-admin";
const TIMEZONE = "America/New_York";

const profiles: ProfileSummary[] = [
  {
    id: "emp-alex",
    first_name: "Alex",
    last_name: "Rivera",
    email: "alex.rivera@example.com",
    avatar_url: null,
  },
  {
    id: "emp-jordan",
    first_name: "Jordan",
    last_name: "Lee",
    email: "jordan.lee@example.com",
    avatar_url: null,
  },
  {
    id: "emp-priya",
    first_name: "Priya",
    last_name: "Singh",
    email: "priya.singh@example.com",
    avatar_url: null,
  },
];

const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

type ShiftConfig = {
  id: string;
  dayOffset: number;
  startTime: string;
  endTime: string;
  title: string;
  role: string;
  location: string;
  color: string;
  requiredHeadcount: number;
  notes?: string | null;
  assignments?: Array<{ userId: string; status?: string }>;
};

const createDateTimeString = (base: Date, dayOffset: number, time: string) => {
  const target = addDays(base, dayOffset);
  const [hour, minute] = time
    .split(":")
    .map((value) => Number.parseInt(value, 10));
  target.setHours(
    Number.isFinite(hour) ? hour : 9,
    Number.isFinite(minute) ? minute : 0,
    0,
    0,
  );
  return target.toISOString();
};

const createShift = (
  base: Date,
  config: ShiftConfig,
  nowIso: string,
): { shift: ShiftWithAssignments; assignments: AssignmentWithUser[] } => {
  const startTime = createDateTimeString(
    base,
    config.dayOffset,
    config.startTime,
  );
  const endTime = createDateTimeString(base, config.dayOffset, config.endTime);

  const assignments: AssignmentWithUser[] = (config.assignments ?? []).map(
    (assignment, index) => ({
      id: `assign-${config.id}-${index + 1}`,
      schedule_id: config.id,
      user_id: assignment.userId,
      assigned_by: CREATOR_ID,
      assigned_at: nowIso,
      confirmed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      status: assignment.status ?? "assigned",
      user: profileMap.get(assignment.userId) ?? null,
    }),
  );

  const shift: ShiftWithAssignments = {
    id: config.id,
    company_id: COMPANY_ID,
    created_at: nowIso,
    created_by: CREATOR_ID,
    updated_at: nowIso,
    title: config.title,
    role: config.role,
    start_time: startTime,
    end_time: endTime,
    location: config.location,
    break_minutes: 30,
    color: config.color,
    timezone: TIMEZONE,
    notes: config.notes ?? null,
    position_id: null,
    required_headcount: config.requiredHeadcount,
    requirements: null,
    template_id: null,
    is_all_day: false,
    is_published: true,
    is_template: false,
    hourly_rate: 18,
    status: "scheduled",
    user_id: null,
    assignments,
  };

  return { shift, assignments };
};

export interface SchedulingFallbackData {
  profiles: ProfileSummary[];
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  staffAvailability: StaffAvailabilityRow[];
  vendorEvents: VendorEventWithMetadata[];
}

export function buildSchedulingFallbackData(
  params: BuildFallbackParams = {},
): SchedulingFallbackData {
  const base = params.start ? new Date(params.start) : startOfWeek(new Date());
  base.setHours(0, 0, 0, 0);
  const nowIso = new Date().toISOString();

  const shiftConfigs: ShiftConfig[] = [
    {
      id: "shift-morning-barista",
      dayOffset: 1,
      startTime: "07:30",
      endTime: "15:30",
      title: "Morning Barista",
      role: "Barista",
      location: "Cafe - Downtown",
      color: "#34d399",
      requiredHeadcount: 2,
      notes: "Focus on morning rush efficiency.",
      assignments: [{ userId: "emp-alex" }, { userId: "emp-jordan" }],
    },
    {
      id: "shift-evening-shift",
      dayOffset: 2,
      startTime: "12:00",
      endTime: "20:00",
      title: "Evening Shift Lead",
      role: "Shift Lead",
      location: "Cafe - Downtown",
      color: "#60a5fa",
      requiredHeadcount: 1,
      notes: "Cover evening close and inventory check.",
      assignments: [{ userId: "emp-priya" }],
    },
    {
      id: "shift-weekend-support",
      dayOffset: 4,
      startTime: "09:00",
      endTime: "17:00",
      title: "Weekend Support",
      role: "Support",
      location: "Cafe - Riverside",
      color: "#facc15",
      requiredHeadcount: 1,
      notes: "On-call support for weekend crowd.",
      assignments: [],
    },
  ];

  const shiftResults = shiftConfigs.map((config) =>
    createShift(base, config, nowIso),
  );
  const shifts = shiftResults.map((result) => result.shift);
  const assignments = shiftResults.flatMap((result) => result.assignments);

  const timeOffStart = addDays(base, 3);
  const timeOffEnd = addDays(timeOffStart, 1);

  const timeOff: TimeOffWithUser[] = [
    {
      id: "timeoff-emp-jordan",
      user_id: "emp-jordan",
      start_date: format(timeOffStart, "yyyy-MM-dd"),
      end_date: format(timeOffEnd, "yyyy-MM-dd"),
      type: "vacation",
      status: "approved",
      reason: "Family travel",
      notes: null,
      approved_at: nowIso,
      approved_by: CREATOR_ID,
      created_at: nowIso,
      updated_at: nowIso,
      user: profileMap.get("emp-jordan") ?? null,
    },
  ];

  const unavailabilityStart = createDateTimeString(base, 5, "10:00");
  const unavailabilityEnd = createDateTimeString(base, 5, "14:00");

  const unavailability: UnavailabilityWithUser[] = [
    {
      id: "ua-emp-alex-training",
      user_id: "emp-alex",
      created_at: nowIso,
      created_by: CREATOR_ID,
      updated_at: nowIso,
      start_time: unavailabilityStart,
      end_time: unavailabilityEnd,
      reason: "Training session",
      is_recurring: false,
      recurring_pattern: null,
      user: profileMap.get("emp-alex") ?? null,
      createdBy: {
        id: CREATOR_ID,
        first_name: "Operations",
        last_name: "Bot",
        email: "ops.bot@example.com",
        avatar_url: null,
      },
    },
  ];

  const vendorEvents: VendorEventWithMetadata[] = [
    {
      id: "vendor-deep-clean",
      company_id: COMPANY_ID,
      location_id: "location-downtown",
      vendor_type: "cleaning",
      event_date: format(addDays(base, 2), "yyyy-MM-dd"),
      start_time: "21:00",
      end_time: "23:00",
      shift_id: "shift-evening-shift",
      notes: "Monthly deep clean scheduled after closing.",
      created_at: nowIso,
      updated_at: nowIso,
      status: "scheduled",
    } as VendorEventWithMetadata,
  ];

  return {
    profiles,
    shifts,
    assignments,
    timeOff,
    unavailability,
    staffAvailability: [],
    vendorEvents,
  };
}
