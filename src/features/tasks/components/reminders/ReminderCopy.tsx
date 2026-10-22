import type { ReactNode } from "react";

import { useFormContentDisplay } from "@/features/forms/components/FormContentText";

import type { ReminderContentTranslation } from "../../reminderContentFields";

export function ReminderCopy({
  reminderId,
  title,
  description,
  translation,
  children,
}: {
  reminderId: string;
  title: string;
  description?: string | null;
  translation: ReminderContentTranslation | null;
  children?: ReactNode;
}) {
  const display = useFormContentDisplay({
    recordId: reminderId,
    title,
    description,
    translation,
  });

  return (
    <>
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium text-foreground">{display.title}</p>
        {children}
      </div>
      {display.description ? (
        <p className="mt-1 text-xs text-muted-foreground">{display.description}</p>
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
    </>
  );
}
