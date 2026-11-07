export type OnboardingStepKind = "acknowledge" | "upload";

export type OnboardingDocument = {
  id: string;
  title: string;
  storagePath: string;
  fileName: string;
  archivedAt: string | null;
};

export type OnboardingStepView = {
  id: string;
  progressId: string | null;
  title: string;
  body: string;
  kind: OnboardingStepKind;
  required: boolean;
  sortOrder: number;
  done: boolean;
  documentId: string | null;
  documentTitle: string | null;
  documentPath: string | null;
  fileName: string | null;
  archivedAt: string | null;
};

export type OnboardingFacts = {
  role: string;
  department: string;
  store: string;
  startDate: string | null;
};

export type OnboardingSubmission = {
  id: string;
  fileName: string;
  storagePath: string;
  personName: string;
  stepTitle: string;
  completedAt: string | null;
};

export type EmployeeOnboardingReady = {
  kind: "ready";
  enrollmentId: string;
  companyId: string;
  status: "active" | "complete";
  companyName: string;
  welcomeTitle: string;
  welcomeBody: string;
  facts: OnboardingFacts;
  steps: OnboardingStepView[];
};

export type EmployeeOnboardingState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "missing" }
  | { kind: "error" }
  | EmployeeOnboardingReady;

export type OnboardingSettingsState = {
  welcomeTitle: string;
  welcomeBody: string;
  documents: OnboardingDocument[];
  steps: OnboardingStepView[];
  submissions: OnboardingSubmission[];
};
