/**
 * Types for team directory feature
 */

import type { Tables } from "@/integrations/supabase/public-types";

export type Department = Tables<"departments"> & { color?: string | null };
export type EmployeesTab = "all" | "managers" | "inactive" | "vendors";
