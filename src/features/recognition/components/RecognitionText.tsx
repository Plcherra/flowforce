import { useFormContentDisplay } from "@/features/forms/components/FormContentText";
import type { AppLanguage } from "@/i18n/resolveLanguage";

export function RecognitionText({
  recordId,
  text,
  translation,
  className,
}: {
  recordId: string;
  text: string;
  translation: { sourceLocale: AppLanguage; text: string } | null;
  className?: string;
}) {
  const display = useFormContentDisplay({
    recordId,
    title: text,
    translation: translation
      ? { sourceLocale: translation.sourceLocale, title: translation.text, description: null }
      : null,
  });

  return (
    <div>
      <p className={className}>{display.title}</p>
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
