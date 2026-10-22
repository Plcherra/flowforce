import { useFormContentDisplay } from "@/features/forms/components/FormContentText";

import type { LearningTranslation } from "@/features/learning/learningContent";

export function LearningRecordCopy({
  recordId,
  title,
  description,
  emptyDescription,
  translation,
  titleClassName,
}: {
  recordId: string;
  title: string;
  description?: string | null;
  emptyDescription?: string;
  translation: LearningTranslation | null;
  titleClassName?: string;
}) {
  const display = useFormContentDisplay({
    recordId,
    title,
    description,
    translation,
  });
  const descriptionText = display.description ?? emptyDescription ?? null;

  return (
    <div>
      <p className={titleClassName}>{display.title}</p>
      {descriptionText ? (
        <p className="text-sm text-muted-foreground">{descriptionText}</p>
      ) : null}
      {display.control ? (
        <button
          type="button"
          className="mt-1 text-left text-xs text-muted-foreground underline"
          onClick={display.toggle}
        >
          {display.control}
        </button>
      ) : null}
    </div>
  );
}
