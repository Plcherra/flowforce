/**
 * Shift templates and vendor palette constants
 */

import type {
  ShiftTemplate,
  VendorPaletteItem,
} from "@/features/scheduling/components/drag-drop/types";

export const ROLE_TEMPLATES: ShiftTemplate[] = [
  {
    id: "1",
    name: "Barista Morning",
    role: "Barista",
    color: "#f59e0b",
    startTime: "06:00",
    endTime: "14:00",
    minStaff: 2,
    maxStaff: 4,
  },
  {
    id: "2",
    name: "Barista Evening",
    role: "Barista",
    color: "#f59e0b",
    startTime: "14:00",
    endTime: "22:00",
    minStaff: 2,
    maxStaff: 3,
  },
  {
    id: "3",
    name: "Runner Peak",
    role: "Runner",
    color: "#3b82f6",
    startTime: "11:00",
    endTime: "15:00",
    minStaff: 1,
    maxStaff: 2,
  },
  {
    id: "4",
    name: "Cashier All Day",
    role: "Cashier",
    color: "#10b981",
    startTime: "08:00",
    endTime: "20:00",
    minStaff: 1,
    maxStaff: 2,
  },
  {
    id: "5",
    name: "FOH Supervisor",
    role: "Supervisor",
    color: "#8b5cf6",
    startTime: "09:00",
    endTime: "21:00",
    minStaff: 1,
    maxStaff: 1,
  },
  {
    id: "6",
    name: "Cook Morning",
    role: "Cook",
    color: "#ef4444",
    startTime: "05:00",
    endTime: "13:00",
    minStaff: 1,
    maxStaff: 2,
  },
  {
    id: "7",
    name: "Cook Evening",
    role: "Cook",
    color: "#ef4444",
    startTime: "13:00",
    endTime: "21:00",
    minStaff: 1,
    maxStaff: 2,
  },
];

export const VENDOR_PALETTE: VendorPaletteItem[] = [
  {
    id: "vendor-ecolab",
    label: "Ecolab Service",
    vendorType: "ecolab",
    color: "#0ea5e9",
    defaultDurationHours: 2,
  },
  {
    id: "vendor-electric",
    label: "Electrician",
    vendorType: "electrician",
    color: "#f97316",
    defaultDurationHours: 3,
  },
  {
    id: "vendor-cleaning",
    label: "Cleaning Crew",
    vendorType: "cleaning",
    color: "#22c55e",
    defaultDurationHours: 4,
  },
  {
    id: "vendor-inspection",
    label: "Health Inspection",
    vendorType: "inspection",
    color: "#a855f7",
    defaultDurationHours: 2,
  },
];

const VENDOR_PALETTE_MAP = new Map(
  VENDOR_PALETTE.map((item) => [item.vendorType, item]),
);

/**
 * Get vendor label by type
 */
export function getVendorLabel(vendorType: string): string {
  return (
    VENDOR_PALETTE_MAP.get(vendorType)?.label ?? vendorType.replace(/_/g, " ")
  );
}

/**
 * Get vendor color by type
 */
export function getVendorColor(vendorType: string): string {
  return VENDOR_PALETTE_MAP.get(vendorType)?.color ?? "#2563eb";
}
