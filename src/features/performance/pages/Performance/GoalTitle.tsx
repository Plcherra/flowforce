import { useFormContentDisplay } from "@/features/forms/components/FormContentText";

import type { GoalTranslation } from "@/features/gamification/goalContent";

export function GoalTitle({
  goalId,
  title,
  description,
  translation,
}: {
  goalId: string;
  title: string;
  description?: string | null;
  translation: GoalTranslation | null;
}) {
  const display = useFormContentDisplay({
    recordId: goalId,
    title,
    description,
    translation,
  });

  return (
    <div>
      <p>{display.title}</p>
      {display.description ? (
        <p className="text-xs font-normal text-muted-foreground">{display.description}</p>
      ) : null}
      {display.control ? (
        <button
          type="button"
          className="text-left text-xs font-normal text-muted-foreground underline"
          onClick={display.toggle}
        >
          {display.control}
        </button>
      ) : null}
    </div>
  );
}
