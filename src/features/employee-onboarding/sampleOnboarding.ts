import type { EmployeeOnboardingReady, OnboardingSettingsState } from "./types";

export const sampleEmployeeOnboarding: EmployeeOnboardingReady = {
  kind: "ready",
  enrollmentId: "enrollment",
  companyId: "company",
  status: "active",
  companyName: "Harbor Coffee",
  welcomeTitle: "Welcome to Harbor Coffee",
  welcomeBody:
    "The bar, the pastries, and the regulars are yours to look after. Read the handbook and add your photo ID before your first open.",
  facts: {
    role: "Barista",
    department: "Bar",
    store: "High Street",
    startDate: "2026-11-16",
  },
  steps: [
    {
      id: "handbook",
      progressId: "progress-handbook",
      title: "Read the shop handbook",
      body: "Opening temperatures, milk standards, and how we greet a regular.",
      kind: "acknowledge",
      required: true,
      sortOrder: 1,
      done: false,
      documentId: "handbook-doc",
      documentTitle: "Shop handbook",
      documentPath: "company/handbook-doc/handbook.pdf",
      fileName: null,
      archivedAt: null,
    },
    {
      id: "photo-id",
      progressId: "progress-id",
      title: "Photo ID or right to work",
      body: "Add a photo of your ID or work permit. Only the shop owner and managers can open it.",
      kind: "upload",
      required: true,
      sortOrder: 2,
      done: false,
      documentId: null,
      documentTitle: null,
      documentPath: null,
      fileName: null,
      archivedAt: null,
    },
  ],
};

export const sampleOnboardingSettings: OnboardingSettingsState = {
  welcomeTitle: sampleEmployeeOnboarding.welcomeTitle,
  welcomeBody: sampleEmployeeOnboarding.welcomeBody,
  documents: [
    {
      id: "handbook-doc",
      title: "Shop handbook",
      storagePath: "company/handbook-doc/handbook.pdf",
      fileName: "handbook.pdf",
      archivedAt: null,
    },
  ],
  steps: sampleEmployeeOnboarding.steps,
  submissions: [
    {
      id: "submission",
      fileName: "photo-id.png",
      storagePath: "company/person/progress/photo-id.png",
      personName: "Riley Quinn",
      stepTitle: "Photo ID or right to work",
      completedAt: "2026-11-07T09:00:00.000Z",
    },
  ],
};
