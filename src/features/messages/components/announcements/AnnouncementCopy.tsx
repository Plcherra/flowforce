import { useFormContentDisplay } from "@/features/forms/components/FormContentText";

import type { AnnouncementTranslation } from "../../announcementContent";

export function AnnouncementCopy({
  announcementId,
  title,
  content,
  translation,
}: {
  announcementId: string;
  title: string;
  content: string;
  translation: AnnouncementTranslation | null;
}) {
  const display = useFormContentDisplay({
    recordId: announcementId,
    title,
    description: content,
    translation: translation
      ? {
          sourceLocale: translation.sourceLocale,
          title: translation.title,
          description: translation.content,
        }
      : null,
  });

  return (
    <>
      <div className="text-base font-medium">{display.title}</div>
      {display.description ? (
        <p className="text-sm leading-relaxed">{display.description}</p>
      ) : null}
      {display.control ? (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground underline"
          onClick={display.toggle}
        >
          {display.control}
        </button>
      ) : null}
    </>
  );
}
