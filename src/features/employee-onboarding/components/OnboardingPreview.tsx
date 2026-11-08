"use client";

import { useSearchParams } from "next/navigation";
import { EmployeeOnboardingView } from "./EmployeeOnboardingView";
import { OnboardingOverviewCard } from "./OnboardingOverviewCard";
import { OnboardingSettingsView } from "./OnboardingSettingsView";
import { sampleEmployeeOnboarding, sampleOnboardingSettings } from "../sampleOnboarding";
import { InviteFlowPreview } from "@/features/employees/components/invites/InviteFlowPreview";

function noop() {
  return undefined;
}

export function OnboardingPreview() {
  const screen = useSearchParams().get("screen") ?? "employee";
  if (screen === "invite" || screen === "hiring" || screen === "permissions") {
    return <InviteFlowPreview screen={screen} />;
  }
  if (screen === "settings") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <OnboardingSettingsView
          welcomeTitle={sampleOnboardingSettings.welcomeTitle}
          welcomeBody={sampleOnboardingSettings.welcomeBody}
          documents={sampleOnboardingSettings.documents}
          steps={sampleOnboardingSettings.steps}
          submissions={sampleOnboardingSettings.submissions}
          canManageSteps
          canManageDocuments
          busy={false}
          onSaveWelcome={noop}
          onUploadDocument={noop}
          onArchiveDocument={noop}
          onOpenDocument={noop}
          onCreateStep={noop}
          onArchiveStep={noop}
          onMoveStep={noop}
          onOpenSubmission={noop}
        />
      </div>
    );
  }
  if (screen === "overview") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-6">
        <OnboardingOverviewCard data={sampleEmployeeOnboarding} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <EmployeeOnboardingView
        data={sampleEmployeeOnboarding}
        busyId={null}
        onOpenDocument={noop}
        onAcknowledge={noop}
        onUpload={noop}
        onFinish={noop}
      />
    </div>
  );
}
