import { CreateGoalModal, type GoalFormValues } from '@/components/goals/CreateGoalModal';
import type { Goal } from '@/hooks/useGoals';
import type { GoalDialogs } from '@/hooks/useGoalDialogs';

interface GoalModalProps {
  dialogs: GoalDialogs;
  saving: boolean;
  onCreate: (values: GoalFormValues) => Promise<void>;
  onUpdate: (goal: Goal, values: GoalFormValues) => Promise<void>;
}

export function GoalModal({ dialogs, saving, onCreate, onUpdate }: GoalModalProps) {
  const handleSubmit = async (values: GoalFormValues) => {
    if (dialogs.selectedGoal) {
      await onUpdate(dialogs.selectedGoal, values);
    } else {
      await onCreate(values);
    }
    dialogs.close();
  };

  return (
    <CreateGoalModal
      open={dialogs.isOpen}
      onOpenChange={(next) => {
        if (!next) {
          dialogs.close();
        }
      }}
      initialGoal={dialogs.selectedGoal ?? undefined}
      aiSuggestion={dialogs.suggestion ?? undefined}
      saving={saving}
      onSubmit={(values) => handleSubmit(values)}
    />
  );
}
