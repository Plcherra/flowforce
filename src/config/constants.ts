// Validation constants and business rules
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRED_PATTERNS: {
      UPPERCASE: /[A-Z]/,
      LOWERCASE: /[a-z]/,
      NUMBER: /\d/,
      SPECIAL_CHAR: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    },
  },
  ONBOARDING: {
    MIN_ROLES_REQUIRED: 4,
    MIN_SECTIONS_REQUIRED: 1,
    MIN_POSITIONS_REQUIRED: 0,
  },
  FORM: {
    DESCRIPTION_MAX_LENGTH: 500,
    NAME_MAX_LENGTH: 100,
    PHONE_PATTERN: /^[\+]?[1-9][\d]{0,15}$/,
  },
} as const;

// Step configuration for onboarding
export const ONBOARDING_STEPS = {
  CUSTOM_TEMPLATE: {
    TOTAL_STEPS: 6,
    STEPS: [
      { id: 1, key: "info" },
      { id: 2, key: "template" },
      { id: 3, key: "customTemplate" },
      { id: 4, key: "sections" },
      { id: 5, key: "roles" },
      { id: 6, key: "review" },
    ],
  },
  STANDARD_TEMPLATE: {
    TOTAL_STEPS: 5,
    STEPS: [
      { id: 1, key: "info" },
      { id: 2, key: "template" },
      { id: 3, key: "sections" },
      { id: 4, key: "roles" },
      { id: 5, key: "review" },
    ],
  },
} as const;

// UI Configuration constants
export const UI_CONFIG = {
  ANIMATIONS: {
    DURATION: 0.6,
    STAGGER_DELAY: 0.1,
  },
  DISPLAY_LIMITS: {
    VISIBLE_SHIFTS_IN_DAY: 3,
    VISIBLE_ASSIGNMENTS_PER_SHIFT: 3,
    MAX_FORM_FIELD_PREVIEW: 10,
  },
} as const;
