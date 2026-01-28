import type { QueryClient } from "@tanstack/react-query";

const fallbackCompanyKey = (companyId?: string | null) =>
  companyId ?? "no-company";
const fallbackProfileKey = (profileId?: string | null) =>
  profileId ?? "no-profile";

export const learningKeys = {
  base: ["learning-center"] as const,
  catalog: (companyKey: string) =>
    ["learning-center", "catalog", companyKey] as const,
  enrollments: (companyKey: string, profileKey: string) =>
    ["learning-center", "enrollments", companyKey, profileKey] as const,
  adminEnrollments: (companyKey: string) =>
    ["learning-center", "admin-enrollments", companyKey] as const,
  metrics: (companyKey: string) =>
    ["learning-center", "metrics", companyKey] as const,
  insights: (companyKey: string) =>
    ["learning-center", "insights", companyKey] as const,
  skillSnapshot: (companyKey: string, profileKey: string) =>
    ["learning-center", "skill-snapshot", companyKey, profileKey] as const,
  progressPrefix: (companyKey: string, profileKey: string) =>
    ["learning-center", "progress", companyKey, profileKey] as const,
  progress: (
    companyKey: string,
    profileKey: string,
    enrollmentIdsKey: string,
  ) =>
    [
      "learning-center",
      "progress",
      companyKey,
      profileKey,
      enrollmentIdsKey,
    ] as const,
};

export const learningKeyHelpers = {
  companyKey: fallbackCompanyKey,
  profileKey: fallbackProfileKey,
};

export const learningInvalidators = {
  catalog: (queryClient: QueryClient, companyKey: string) =>
    queryClient.invalidateQueries({
      queryKey: learningKeys.catalog(companyKey),
    }),
  enrollments: (
    queryClient: QueryClient,
    companyKey: string,
    profileKey: string,
  ) =>
    queryClient.invalidateQueries({
      queryKey: learningKeys.enrollments(companyKey, profileKey),
    }),
  progress: (
    queryClient: QueryClient,
    companyKey: string,
    profileKey: string,
  ) =>
    queryClient.invalidateQueries({
      queryKey: learningKeys.progressPrefix(companyKey, profileKey),
    }),
  metrics: (queryClient: QueryClient, companyKey: string) =>
    queryClient.invalidateQueries({
      queryKey: learningKeys.metrics(companyKey),
    }),
  insights: (queryClient: QueryClient, companyKey: string) =>
    queryClient.invalidateQueries({
      queryKey: learningKeys.insights(companyKey),
    }),
  adminEnrollments: (queryClient: QueryClient, companyKey: string) =>
    queryClient.invalidateQueries({
      queryKey: learningKeys.adminEnrollments(companyKey),
    }),
  base: (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: learningKeys.base }),
};
