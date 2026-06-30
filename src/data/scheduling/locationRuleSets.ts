import type { Area, Weekday } from "@/server/copilot/rules-loader";

export type CoverageSlotTemplate = {
  area: Area;
  roleId: string;
  roleName: string;
  start: string; // HH:MM
  end: string; // HH:MM
  headcount: number;
  isCloser?: boolean;
  tags?: string[];
};

export interface ComplianceRules {
  maxHoursPerWeek: number;
  maxHoursPerWeekPartTime: number;
  minRestHours: number;
  maxConsecutiveDays: number;
  minorsLatestEnd: string; // HH:MM
  softTargets: {
    coverageRatio: number;
    weekendCoverage: number;
  };
}

export interface CopilotEmployeeSeed {
  id: string;
  name: string;
  locationIds: string[];
  area: Area;
  roles: string[];
  qualificationIds: string[];
  availability: {
    weekday: number; // 0-6 Sun=0
    ranges: { start: string; end: string }[];
    canOpen?: boolean;
    canClose?: boolean;
  }[];
  maxHoursWeek?: number;
  preferredDaysOff?: number[];
  isTrainee?: boolean;
}

export interface LocationRuleSet {
  id: string;
  name: string;
  timezone: string;
  coverageTemplates: Record<Weekday, CoverageSlotTemplate[]>;
  compliance: ComplianceRules;
  employeeSeeds: CopilotEmployeeSeed[];
}

const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const sharedWeekendTemplate: CoverageSlotTemplate[] = [
  {
    area: "FOH",
    roleId: "foh_barista",
    roleName: "Barista",
    start: "07:00",
    end: "15:00",
    headcount: 3,
    tags: ["peak"],
  },
  {
    area: "FOH",
    roleId: "foh_barista",
    roleName: "Barista",
    start: "11:00",
    end: "19:00",
    headcount: 3,
    tags: ["peak"],
  },
  {
    area: "FOH",
    roleId: "foh_service_lead",
    roleName: "Floor Lead",
    start: "09:00",
    end: "17:00",
    headcount: 1,
  },
  {
    area: "FOH",
    roleId: "foh_service_lead",
    roleName: "Closer Lead",
    start: "15:00",
    end: "23:00",
    headcount: 1,
    isCloser: true,
  },
  {
    area: "BOH",
    roleId: "boh_line",
    roleName: "Line Cook",
    start: "08:00",
    end: "16:00",
    headcount: 3,
    tags: ["peak"],
  },
  {
    area: "BOH",
    roleId: "boh_line",
    roleName: "Line Cook",
    start: "12:00",
    end: "20:00",
    headcount: 3,
    tags: ["peak"],
  },
  {
    area: "BOH",
    roleId: "bohprep",
    roleName: "Prep Cook",
    start: "06:00",
    end: "14:00",
    headcount: 2,
  },
  {
    area: "BOH",
    roleId: "bohprep",
    roleName: "Prep Cook",
    start: "14:00",
    end: "22:00",
    headcount: 1,
    isCloser: true,
  },
];

const inmanWeekdayTemplate: CoverageSlotTemplate[] = [
  {
    area: "FOH",
    roleId: "foh_barista",
    roleName: "Barista",
    start: "06:30",
    end: "14:30",
    headcount: 2,
    tags: ["open"],
  },
  {
    area: "FOH",
    roleId: "foh_barista",
    roleName: "Barista",
    start: "10:00",
    end: "18:00",
    headcount: 2,
  },
  {
    area: "FOH",
    roleId: "foh_barista",
    roleName: "Barista Closer",
    start: "14:00",
    end: "22:00",
    headcount: 2,
    isCloser: true,
  },
  {
    area: "FOH",
    roleId: "foh_service_lead",
    roleName: "Floor Lead",
    start: "08:00",
    end: "16:00",
    headcount: 1,
  },
  {
    area: "FOH",
    roleId: "foh_host",
    roleName: "Host",
    start: "09:00",
    end: "17:00",
    headcount: 1,
  },
  {
    area: "BOH",
    roleId: "boh_line",
    roleName: "Line Cook",
    start: "07:00",
    end: "15:00",
    headcount: 2,
  },
  {
    area: "BOH",
    roleId: "boh_line",
    roleName: "Line Cook Closer",
    start: "15:00",
    end: "23:00",
    headcount: 1,
    isCloser: true,
  },
  {
    area: "BOH",
    roleId: "bohprep",
    roleName: "Prep Cook",
    start: "11:00",
    end: "19:00",
    headcount: 2,
  },
];

const oneCanalWeekdayTemplate: CoverageSlotTemplate[] = [
  {
    area: "FOH",
    roleId: "foh_barista",
    roleName: "Morning Barista",
    start: "06:00",
    end: "12:30",
    headcount: 2,
    tags: ["open"],
  },
  {
    area: "FOH",
    roleId: "foh_cashier",
    roleName: "Cashier",
    start: "07:00",
    end: "15:00",
    headcount: 2,
  },
  {
    area: "FOH",
    roleId: "foh_runner",
    roleName: "Runner",
    start: "11:00",
    end: "19:00",
    headcount: 2,
  },
  {
    area: "FOH",
    roleId: "foh_service_lead",
    roleName: "Service Lead",
    start: "09:00",
    end: "17:00",
    headcount: 1,
  },
  {
    area: "FOH",
    roleId: "foh_service_lead",
    roleName: "Closer Lead",
    start: "14:00",
    end: "22:00",
    headcount: 1,
    isCloser: true,
  },
  {
    area: "BOH",
    roleId: "boh_line",
    roleName: "Line Cook",
    start: "06:30",
    end: "14:30",
    headcount: 2,
    tags: ["open"],
  },
  {
    area: "BOH",
    roleId: "boh_line",
    roleName: "Line Cook",
    start: "14:00",
    end: "22:00",
    headcount: 2,
    isCloser: true,
  },
  {
    area: "BOH",
    roleId: "bohprep",
    roleName: "Prep Cook",
    start: "10:00",
    end: "18:00",
    headcount: 2,
  },
];

const inmanEmployees: CopilotEmployeeSeed[] = [
  {
    id: "emp_inman_ashley",
    name: "Ashley Gomez",
    locationIds: ["inman-sq"],
    area: "FOH",
    roles: ["Barista Lead"],
    qualificationIds: ["foh_barista", "foh_service_lead"],
    availability: WEEKDAYS.map((_, idx) => ({
      weekday: idx,
      ranges: [{ start: "06:00", end: "14:30" }],
      canOpen: true,
      canClose: idx >= 3,
    })),
    maxHoursWeek: 38,
    preferredDaysOff: [0],
  },
  {
    id: "emp_inman_lucas",
    name: "Lucas Patel",
    locationIds: ["inman-sq"],
    area: "FOH",
    roles: ["Barista"],
    qualificationIds: ["foh_barista"],
    availability: [
      { weekday: 1, ranges: [{ start: "09:00", end: "19:00" }] },
      { weekday: 2, ranges: [{ start: "09:00", end: "19:00" }] },
      { weekday: 4, ranges: [{ start: "09:00", end: "19:00" }] },
      { weekday: 5, ranges: [{ start: "08:00", end: "18:00" }] },
      { weekday: 6, ranges: [{ start: "08:00", end: "18:00" }] },
    ],
    maxHoursWeek: 32,
    preferredDaysOff: [0, 3],
  },
  {
    id: "emp_inman_noah",
    name: "Noah Williams",
    locationIds: ["inman-sq", "one-canal"],
    area: "FOH",
    roles: ["Closer"],
    qualificationIds: ["foh_barista", "foh_service_lead"],
    availability: WEEKDAYS.map((_, idx) => ({
      weekday: idx,
      ranges: [{ start: "13:00", end: "22:30" }],
      canClose: true,
    })),
    maxHoursWeek: 36,
  },
  {
    id: "emp_inman_jade",
    name: "Jade Chen",
    locationIds: ["inman-sq"],
    area: "FOH",
    roles: ["Host"],
    qualificationIds: ["foh_host"],
    availability: [
      { weekday: 0, ranges: [{ start: "10:00", end: "18:00" }] },
      { weekday: 2, ranges: [{ start: "09:00", end: "17:30" }] },
      { weekday: 3, ranges: [{ start: "09:00", end: "17:30" }] },
      { weekday: 5, ranges: [{ start: "12:00", end: "20:00" }] },
      { weekday: 6, ranges: [{ start: "12:00", end: "20:00" }] },
    ],
    maxHoursWeek: 28,
  },
  {
    id: "emp_inman_mateo",
    name: "Mateo Ruiz",
    locationIds: ["inman-sq"],
    area: "BOH",
    roles: ["Line Cook"],
    qualificationIds: ["boh_line"],
    availability: WEEKDAYS.map((_, idx) => ({
      weekday: idx,
      ranges: [{ start: "07:00", end: "17:00" }],
      canOpen: true,
      canClose: idx >= 4,
    })),
    maxHoursWeek: 40,
  },
  {
    id: "emp_inman_sophia",
    name: "Sophia Martin",
    locationIds: ["inman-sq"],
    area: "BOH",
    roles: ["Prep Cook"],
    qualificationIds: ["bohprep"],
    availability: [
      { weekday: 1, ranges: [{ start: "10:00", end: "20:00" }] },
      { weekday: 2, ranges: [{ start: "10:00", end: "20:00" }] },
      { weekday: 3, ranges: [{ start: "08:00", end: "16:00" }] },
      { weekday: 5, ranges: [{ start: "08:00", end: "16:00" }] },
      { weekday: 6, ranges: [{ start: "08:00", end: "16:00" }] },
    ],
    maxHoursWeek: 34,
  },
  {
    id: "emp_inman_emma",
    name: "Emma Brooks",
    locationIds: ["inman-sq"],
    area: "BOH",
    roles: ["Line Cook"],
    qualificationIds: ["boh_line"],
    availability: [
      {
        weekday: 0,
        ranges: [{ start: "15:00", end: "23:00" }],
        canClose: true,
      },
      {
        weekday: 2,
        ranges: [{ start: "15:00", end: "23:00" }],
        canClose: true,
      },
      {
        weekday: 3,
        ranges: [{ start: "15:00", end: "23:00" }],
        canClose: true,
      },
      {
        weekday: 4,
        ranges: [{ start: "15:00", end: "23:00" }],
        canClose: true,
      },
      {
        weekday: 6,
        ranges: [{ start: "13:00", end: "21:00" }],
        canClose: true,
      },
    ],
    maxHoursWeek: 30,
  },
  {
    id: "emp_inman_lily",
    name: "Lily Morgan",
    locationIds: ["inman-sq"],
    area: "FOH",
    roles: ["Barista Trainee"],
    qualificationIds: ["foh_barista"],
    availability: [
      { weekday: 1, ranges: [{ start: "10:00", end: "18:00" }] },
      { weekday: 3, ranges: [{ start: "10:00", end: "18:00" }] },
      {
        weekday: 5,
        ranges: [{ start: "12:00", end: "20:00" }],
        canClose: false,
      },
    ],
    maxHoursWeek: 24,
    isTrainee: true,
  },
];

const oneCanalEmployees: CopilotEmployeeSeed[] = [
  {
    id: "empcanal_mason",
    name: "Mason Lee",
    locationIds: ["one-canal"],
    area: "FOH",
    roles: ["Barista Lead"],
    qualificationIds: ["foh_barista", "foh_service_lead"],
    availability: WEEKDAYS.map((_, idx) => ({
      weekday: idx,
      ranges: [{ start: "05:30", end: "14:00" }],
      canOpen: true,
    })),
    maxHoursWeek: 38,
    preferredDaysOff: [6],
  },
  {
    id: "empcanal_ariana",
    name: "Ariana Flores",
    locationIds: ["one-canal"],
    area: "FOH",
    roles: ["Cashier"],
    qualificationIds: ["foh_cashier"],
    availability: [
      { weekday: 1, ranges: [{ start: "07:00", end: "17:00" }] },
      { weekday: 2, ranges: [{ start: "07:00", end: "17:00" }] },
      { weekday: 3, ranges: [{ start: "07:00", end: "17:00" }] },
      { weekday: 4, ranges: [{ start: "07:00", end: "17:00" }] },
      { weekday: 5, ranges: [{ start: "07:00", end: "15:00" }] },
    ],
    maxHoursWeek: 35,
  },
  {
    id: "empcanal_zoe",
    name: "Zoe Carter",
    locationIds: ["one-canal"],
    area: "FOH",
    roles: ["Runner"],
    qualificationIds: ["foh_runner"],
    availability: [
      { weekday: 0, ranges: [{ start: "10:00", end: "20:00" }] },
      { weekday: 2, ranges: [{ start: "11:00", end: "19:30" }] },
      { weekday: 3, ranges: [{ start: "11:00", end: "19:30" }] },
      { weekday: 5, ranges: [{ start: "11:00", end: "19:30" }] },
      { weekday: 6, ranges: [{ start: "11:00", end: "19:30" }] },
    ],
    maxHoursWeek: 30,
  },
  {
    id: "empcanal_dylan",
    name: "Dylan Murphy",
    locationIds: ["one-canal", "inman-sq"],
    area: "FOH",
    roles: ["Closer"],
    qualificationIds: ["foh_service_lead", "foh_runner"],
    availability: WEEKDAYS.map((_, idx) => ({
      weekday: idx,
      ranges: [{ start: "14:00", end: "22:30" }],
      canClose: true,
    })),
    maxHoursWeek: 34,
  },
  {
    id: "empcanal_isabella",
    name: "Isabella Reed",
    locationIds: ["one-canal"],
    area: "BOH",
    roles: ["Line Cook"],
    qualificationIds: ["boh_line"],
    availability: WEEKDAYS.map((_, idx) => ({
      weekday: idx,
      ranges: [{ start: "06:00", end: "16:00" }],
      canOpen: true,
    })),
    maxHoursWeek: 40,
  },
  {
    id: "empcanal_omar",
    name: "Omar Hassan",
    locationIds: ["one-canal"],
    area: "BOH",
    roles: ["Line Cook"],
    qualificationIds: ["boh_line"],
    availability: [
      {
        weekday: 1,
        ranges: [{ start: "14:00", end: "22:30" }],
        canClose: true,
      },
      {
        weekday: 2,
        ranges: [{ start: "14:00", end: "22:30" }],
        canClose: true,
      },
      {
        weekday: 3,
        ranges: [{ start: "14:00", end: "22:30" }],
        canClose: true,
      },
      {
        weekday: 4,
        ranges: [{ start: "14:00", end: "22:30" }],
        canClose: true,
      },
      {
        weekday: 6,
        ranges: [{ start: "14:00", end: "22:30" }],
        canClose: true,
      },
    ],
    maxHoursWeek: 32,
  },
  {
    id: "empcanal_rachel",
    name: "Rachel Kim",
    locationIds: ["one-canal"],
    area: "BOH",
    roles: ["Prep Cook"],
    qualificationIds: ["bohprep"],
    availability: [
      { weekday: 0, ranges: [{ start: "08:00", end: "16:00" }] },
      { weekday: 2, ranges: [{ start: "08:00", end: "16:00" }] },
      { weekday: 4, ranges: [{ start: "08:00", end: "16:00" }] },
      { weekday: 5, ranges: [{ start: "08:00", end: "16:00" }] },
      { weekday: 6, ranges: [{ start: "08:00", end: "16:00" }] },
    ],
    maxHoursWeek: 30,
  },
  {
    id: "empcanal_dev",
    name: "Dev Shah",
    locationIds: ["one-canal"],
    area: "FOH",
    roles: ["Barista Trainee"],
    qualificationIds: ["foh_barista"],
    availability: [
      { weekday: 1, ranges: [{ start: "09:00", end: "17:00" }] },
      { weekday: 3, ranges: [{ start: "09:00", end: "17:00" }] },
      {
        weekday: 4,
        ranges: [{ start: "12:00", end: "20:00" }],
        canClose: false,
      },
    ],
    maxHoursWeek: 24,
    isTrainee: true,
  },
];

const inmanCoverage: Record<Weekday, CoverageSlotTemplate[]> = {
  Mon: inmanWeekdayTemplate,
  Tue: inmanWeekdayTemplate,
  Wed: inmanWeekdayTemplate,
  Thu: inmanWeekdayTemplate,
  Fri: [...inmanWeekdayTemplate, ...sharedWeekendTemplate.slice(0, 4)],
  Sat: sharedWeekendTemplate,
  Sun: sharedWeekendTemplate,
};

const oneCanalCoverage: Record<Weekday, CoverageSlotTemplate[]> = {
  Mon: oneCanalWeekdayTemplate,
  Tue: oneCanalWeekdayTemplate,
  Wed: oneCanalWeekdayTemplate,
  Thu: oneCanalWeekdayTemplate,
  Fri: [...oneCanalWeekdayTemplate, ...sharedWeekendTemplate.slice(0, 3)],
  Sat: sharedWeekendTemplate,
  Sun: sharedWeekendTemplate,
};

export const LOCATION_RULESETS: LocationRuleSet[] = [
  {
    id: "inman-sq",
    name: "Inman Sq",
    timezone: "America/New_York",
    coverageTemplates: inmanCoverage,
    compliance: {
      maxHoursPerWeek: 40,
      maxHoursPerWeekPartTime: 28,
      minRestHours: 10,
      maxConsecutiveDays: 6,
      minorsLatestEnd: "21:30",
      softTargets: {
        coverageRatio: 0.95,
        weekendCoverage: 0.98,
      },
    },
    employeeSeeds: inmanEmployees,
  },
  {
    id: "one-canal",
    name: "One Canal",
    timezone: "America/New_York",
    coverageTemplates: oneCanalCoverage,
    compliance: {
      maxHoursPerWeek: 42,
      maxHoursPerWeekPartTime: 30,
      minRestHours: 10,
      maxConsecutiveDays: 6,
      minorsLatestEnd: "21:30",
      softTargets: {
        coverageRatio: 0.93,
        weekendCoverage: 0.97,
      },
    },
    employeeSeeds: oneCanalEmployees,
  },
];

export function getLocationRuleSet(id?: string): LocationRuleSet | undefined {
  if (!id) return undefined;
  return LOCATION_RULESETS.find((ruleset) => ruleset.id === id);
}

export function listLocationRuleSets(): LocationRuleSet[] {
  return [...LOCATION_RULESETS];
}
