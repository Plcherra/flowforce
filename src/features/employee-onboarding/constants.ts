export const COMPANY_DOCS_BUCKET = "onboarding-company-files";
export const EMPLOYEE_FILES_BUCKET = "onboarding-employee-files";
export const MAX_ONBOARDING_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 120;

export const ONBOARDING_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type OnboardingMimeType = (typeof ONBOARDING_MIME_TYPES)[number];
