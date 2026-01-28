import { XPBar } from "@/features/gamification/components";
import type { XPBarMilestone } from "@/features/gamification/components/XPBar";

interface XPProgressCardProps {
  currentXp: number;
  nextMilestone: XPBarMilestone;
  previousMilestone?: XPBarMilestone;
  loading: boolean;
}

export function XPProgressCard({
  currentXp,
  nextMilestone,
  previousMilestone,
  loading,
}: XPProgressCardProps) {
  return (
    <XPBar
      currentXP={currentXp}
      nextMilestone={nextMilestone}
      previousMilestone={previousMilestone}
      loading={loading}
      className="h-full"
    />
  );
}

export default XPProgressCard;
