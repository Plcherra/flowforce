/**
 * Role constants
 */

import type { RoleKey } from "../types/permissions";
import {
  PRODUCT_ROLE_ACCENTS,
  PRODUCT_ROLE_KEYS,
  PRODUCT_ROLE_LABELS,
} from "./productRoles";

export const ROLE_ORDER: RoleKey[] = [...PRODUCT_ROLE_KEYS];

export const ROLE_LABELS: Record<RoleKey, string> = PRODUCT_ROLE_LABELS;

export const ROLE_ACCENTS: Record<RoleKey, string> = PRODUCT_ROLE_ACCENTS;
