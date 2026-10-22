import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const InternalCommunicationSVG = lazy(() =>
  {
  const { t } = useTranslation();
  return Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="hsl(var(--destructive))" />

        {/* Chat bubbles */}
        <rect x="50" y="60" width="80" height="30" fill="hsl(var(--accent))" rx="15" />
        <text x="90" y="78" textAnchor="middle" fill="white" fontSize="10">
          {t("landing.helloTeam")}
        </text>
        <polygon points="130,85 140,90 130,95" fill="hsl(var(--accent))" />

        <rect x="170" y="100" width="80" height="30" fill="hsl(var(--muted))" rx="15" />
        <text x="210" y="118" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10">
          {t("landing.gotItThanks")}
        </text>
        <polygon points="170,125 160,130 170,135" fill="hsl(var(--muted))" />

        {/* Team icons */}
        <circle cx="70" cy="40" r="8" fill="hsl(var(--accent))" />
        <circle cx="230" cy="150" r="8" fill="hsl(var(--muted-foreground))" />

        {/* Message indicator */}
        <circle cx="250" cy="70" r="15" fill="hsl(var(--success))" />
        <text
          x="250"
          y="75"
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontWeight="bold"
        >
          3
        </text>

        {/* Title */}
        <text
          x="150"
          y="180"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="14"
          fontWeight="medium"
        >
          {t("features.internalCommunication.title")}
        </text>
      </svg>
    ),
  });
},
);

export function InternalCommunication() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full bg-accent/60 rounded-lg p-4">
      <Suspense
        fallback={<IllustrationSkeleton title={t("features.internalCommunication.title")} />}
      >
        <InternalCommunicationSVG />
      </Suspense>
    </div>
  );
}
