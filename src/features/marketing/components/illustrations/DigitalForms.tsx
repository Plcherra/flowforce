import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

function DigitalFormsSvg() {
  const { t } = useTranslation();
  return (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="hsl(var(--warning))" />

        {/* Form document */}
        <rect
          x="80"
          y="30"
          width="140"
          height="140"
          fill="white"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          rx="4"
        />

        {/* Form header */}
        <rect x="90" y="40" width="120" height="20" fill="hsl(var(--warning))" />
        <text
          x="150"
          y="53"
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          {t("landing.digitalForm")}
        </text>

        {/* Form fields */}
        <rect x="95" y="75" width="110" height="12" fill="hsl(var(--background))" rx="2" />
        <text x="100" y="83" fill="hsl(var(--muted-foreground))" fontSize="8">
          {t("landing.nameField")}
        </text>

        <rect x="95" y="95" width="110" height="12" fill="hsl(var(--background))" rx="2" />
        <text x="100" y="103" fill="hsl(var(--muted-foreground))" fontSize="8">
          {t("landing.emailField")}
        </text>

        {/* Checkboxes */}
        <rect x="95" y="115" width="8" height="8" fill="hsl(var(--success))" rx="1" />
        <text x="108" y="122" fill="hsl(var(--foreground))" fontSize="8">
          {t("landing.optionA")}
        </text>
        <path
          d="M97 118 L99 120 L101 116"
          fill="none"
          stroke="white"
          strokeWidth="1"
        />

        <rect
          x="95"
          y="130"
          width="8"
          height="8"
          fill="white"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          rx="1"
        />
        <text x="108" y="137" fill="hsl(var(--muted-foreground))" fontSize="8">
          {t("landing.optionB")}
        </text>

        {/* Submit button */}
        <rect x="120" y="150" width="60" height="15" fill="hsl(var(--warning))" rx="3" />
        <text
          x="150"
          y="160"
          textAnchor="middle"
          fill="white"
          fontSize="9"
          fontWeight="bold"
        >
          {t("forms.submit")}
        </text>

        {/* Digital signature area */}
        <rect
          x="40"
          y="120"
          width="30"
          height="30"
          fill="hsl(var(--warning))"
          stroke="hsl(var(--warning))"
          strokeWidth="1"
          strokeDasharray="3,3"
          rx="2"
        />
        <text x="55" y="130" textAnchor="middle" fill="hsl(var(--warning))" fontSize="6">
          {t("landing.digital")}
        </text>
        <text x="55" y="140" textAnchor="middle" fill="hsl(var(--warning))" fontSize="6">
          {t("forms.signature")}
        </text>

        {/* Title */}
        <text
          x="150"
          y="190"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="14"
          fontWeight="medium"
        >
          {t("features.digitalForms.title")}
        </text>
      </svg>
  );
}

const DigitalFormsSVG = lazy(() => Promise.resolve({ default: DigitalFormsSvg }));


export function DigitalForms() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full bg-warning-muted rounded-lg p-4">
      <Suspense fallback={<IllustrationSkeleton title={t("features.digitalForms.title")} />}>
        <DigitalFormsSVG />
      </Suspense>
    </div>
  );
}
