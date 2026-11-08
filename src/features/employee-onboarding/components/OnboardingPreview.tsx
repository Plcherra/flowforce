"use client";

import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { EmployeeOnboardingView } from "./EmployeeOnboardingView";
import { OnboardingOverviewCard } from "./OnboardingOverviewCard";
import { OnboardingSettingsView } from "./OnboardingSettingsView";
import { sampleEmployeeOnboarding, sampleOnboardingSettings } from "../sampleOnboarding";
import { InviteFlowPreview } from "@/features/employees/components/invites/InviteFlowPreview";
import type { HiringBlock } from "../hiringModel";

function noop() {
  return undefined;
}

export function OnboardingPreview() {
  const { t } = useTranslation();
  const screen = useSearchParams().get("screen") ?? "employee";
  if (screen === "invite" || screen === "hiring" || screen === "permissions") {
    return <InviteFlowPreview screen={screen} />;
  }
  if (screen === "hire") {
    const blocks: HiringBlock[] = [
      {
        id: "welcome",
        kind: "share_card",
        title: t("hireActivity.previewWelcomeTitle"),
        body: t("hireActivity.previewWelcomeBody"),
        required: true,
        sortOrder: 0,
        linkUrl: null,
        fileName: null,
        storagePath: null,
      },
      {
        id: "id",
        kind: "collect_file",
        title: t("hireActivity.previewFileTitle"),
        body: t("hireActivity.previewFileBody"),
        required: true,
        sortOrder: 1,
        linkUrl: null,
        fileName: null,
        storagePath: null,
      },
    ];
    return (
      <EmployeeOnboardingView
        data={{
          kind: "ready",
          enrollmentId: "preview",
          companyId: "preview",
          status: "active",
          companyName: "Harbor Coffee",
          welcomeTitle: "",
          welcomeBody: "",
          facts: {
            role: "Barista",
            department: "FOH",
            store: "store 1",
            startDate: "2026-11-16",
          },
          steps: [],
        }}
        hiringBlocks={blocks}
        openRequired={1}
        busyId={null}
        onOpenDocument={() => undefined}
        onAcknowledge={() => undefined}
        onUpload={() => undefined}
        onFinish={() => undefined}
      />
    );
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
