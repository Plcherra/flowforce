import { useFormContentDisplay } from "@/features/forms/components/FormContentText";

import type { ScheduleTextTranslation } from "../scheduleTextFields";

export function ShiftGridCopy({
  shiftId,
  title,
  notes,
  fallback,
  translation,
  titleClassName,
  notesClassName,
}: {
  shiftId: string;
  title?: string | null;
  notes?: string | null;
  fallback: string;
  translation: ScheduleTextTranslation | null;
  titleClassName: string;
  notesClassName: string;
}) {
  const hasTitle = Boolean(title && title.trim());
  const display = useFormContentDisplay({
    recordId: shiftId,
    title: hasTitle ? title ?? "" : fallback,
    description: notes,
    translation:
      hasTitle && translation
        ? {
            sourceLocale: translation.sourceLocale,
            title: translation.title,
            description: translation.notes,
          }
        : null,
  });

  return (
    <>
      <div className={titleClassName}>{display.title}</div>
      {notes ? <div className={notesClassName}>{display.description}</div> : null}
      {display.control ? (
        <button
          type="button"
          className="text-left text-[11px] underline"
          onClick={(event) => {
            event.stopPropagation();
            display.toggle();
          }}
        >
          {display.control}
        </button>
      ) : null}
    </>
  );
}
