import { OnboardingOverviewCard } from "./OnboardingOverviewCard";
import { useEmployeeOnboarding } from "../useEmployeeOnboarding";

export function EmployeeOnboardingOverview() {
  const screen = useEmployeeOnboarding();
  if (screen.state.kind !== "ready") return null;
  return <OnboardingOverviewCard data={screen.state} />;
}
