import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRecognitions } from "@/hooks/useRecognitions";
import type {
  RecognitionRecord,
  RecognitionSourceType,
} from "@/types/recognition";
import { RecognitionHeader } from "./RecognitionHeader";
import { BadgeGrid, type BadgeCard } from "./BadgeGrid";
import { RecognitionFeed } from "./RecognitionFeed";

type BadgeBlueprint = {
  id: string;
  name: string;
  description: string;
  sources: RecognitionSourceType[];
  required: number;
  xpValue: number;
};

const BADGE_BLUEPRINTS: BadgeBlueprint[] = [
  {
    id: "goal-closer",
    name: "Goal Closer",
    description: "Earn recognitions tied to goal milestones.",
    sources: ["goal_milestone", "goal_completion"],
    required: 3,
    xpValue: 250,
  },
  {
    id: "task-hero",
    name: "Task Hero",
    description: "Complete tasks that trigger recognition.",
    sources: ["task_completion"],
    required: 5,
    xpValue: 150,
  },
  {
    id: "learning-luminary",
    name: "Learning Luminary",
    description: "Finish training or onboarding journeys.",
    sources: ["training_completion", "onboarding_completion"],
    required: 2,
    xpValue: 200,
  },
  {
    id: "culture-champion",
    name: "Culture Champion",
    description: "Share manual shout-outs with the team.",
    sources: ["manual"],
    required: 3,
    xpValue: 100,
  },
];

function buildBadgeCards(recognitions: RecognitionRecord[]): BadgeCard[] {
  const counts = new Map<string, number>();
  recognitions.forEach((recognition) => {
    const source = recognition.reward_details?.source ?? "manual";
    BADGE_BLUEPRINTS.forEach((blueprint) => {
      if (blueprint.sources.includes(source)) {
        counts.set(blueprint.id, (counts.get(blueprint.id) ?? 0) + 1);
      }
    });
  });

  return BADGE_BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id,
    name: blueprint.name,
    description: blueprint.description,
    current: counts.get(blueprint.id) ?? 0,
    required: blueprint.required,
    xpValue: blueprint.xpValue,
  }));
}

export function RecognitionPage() {
  const { recognitions, loading, syncing, error, refresh, syncAutomation } =
    useRecognitions({ lookbackDays: 90 });
  const badges = buildBadgeCards(recognitions);

  return (
    <div className="space-y-6 p-6">
      <RecognitionHeader
        loading={loading}
        syncing={syncing}
        totalRecognitions={recognitions.length}
        onRefresh={() => refresh?.()}
        onSync={() => {
          void syncAutomation?.();
        }}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load recognitions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <BadgeGrid badges={badges} loading={loading} />
      <RecognitionFeed recognitions={recognitions} loading={loading} />
    </div>
  );
}

export default RecognitionPage;
