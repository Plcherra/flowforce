"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmployeeOnboardingView } from "./EmployeeOnboardingView";
import { HiringChecklistView } from "./HiringChecklistView";
import { mergeHiringAnswer, openRequiredHiringBlocks, type HiringAnswer, type HiringBlock } from "../hiringModel";

function previewBlocks(t: (key: string) => string): HiringBlock[] {
  return [
    {
      id: "welcome",
      kind: "share_card",
      title: t("hireActivity.previewWelcomeTitle"),
      body: `<p>${t("hireActivity.previewWelcomeBody")}</p>`,
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
}

export function HireFlowPreview() {
  const { t } = useTranslation();
  const blocks = previewBlocks(t);
  const [answers, setAnswers] = useState<Record<string, HiringAnswer>>({});
  const openRequired = openRequiredHiringBlocks(blocks, answers).length;

  return (
    <div className="space-y-6">
      <div className="px-4 pt-4 sm:px-6">
        <HiringChecklistView
          blocks={blocks}
          answers={answers}
          onAnswer={(block, patch) =>
            setAnswers((current) => ({
              ...current,
              [block.id]: mergeHiringAnswer(block, current[block.id], patch),
            }))
          }
          onUpload={(block, file) =>
            setAnswers((current) => ({
              ...current,
              [block.id]: mergeHiringAnswer(block, current[block.id], { fileName: file.name, done: true }),
            }))
          }
        />
      </div>
      <EmployeeOnboardingView
        hideWelcome
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
            store: "High Street",
            startDate: "2026-11-16",
          },
          steps: [],
        }}
        hiringBlocks={blocks}
        openRequired={openRequired}
        busyId={null}
        onOpenDocument={() => undefined}
        onAcknowledge={() => undefined}
        onUpload={() => undefined}
        onFinish={() => undefined}
      />
    </div>
  );
}
