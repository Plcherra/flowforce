import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const DigitalFormsSVG = lazy(() =>
  Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="#fff7ed" />

        {/* Form document */}
        <rect
          x="80"
          y="30"
          width="140"
          height="140"
          fill="white"
          stroke="#d1d5db"
          strokeWidth="2"
          rx="4"
        />

        {/* Form header */}
        <rect x="90" y="40" width="120" height="20" fill="#f97316" />
        <text
          x="150"
          y="53"
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          Digital Form
        </text>

        {/* Form fields */}
        <rect x="95" y="75" width="110" height="12" fill="#f3f4f6" rx="2" />
        <text x="100" y="83" fill="#9ca3af" fontSize="8">
          Name field
        </text>

        <rect x="95" y="95" width="110" height="12" fill="#f3f4f6" rx="2" />
        <text x="100" y="103" fill="#9ca3af" fontSize="8">
          Email field
        </text>

        {/* Checkboxes */}
        <rect x="95" y="115" width="8" height="8" fill="#22c55e" rx="1" />
        <text x="108" y="122" fill="#374151" fontSize="8">
          Option A ✓
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
          stroke="#d1d5db"
          strokeWidth="1"
          rx="1"
        />
        <text x="108" y="137" fill="#9ca3af" fontSize="8">
          Option B
        </text>

        {/* Submit button */}
        <rect x="120" y="150" width="60" height="15" fill="#f97316" rx="3" />
        <text
          x="150"
          y="160"
          textAnchor="middle"
          fill="white"
          fontSize="9"
          fontWeight="bold"
        >
          Submit
        </text>

        {/* Digital signature area */}
        <rect
          x="40"
          y="120"
          width="30"
          height="30"
          fill="#fef3c7"
          stroke="#f59e0b"
          strokeWidth="1"
          strokeDasharray="3,3"
          rx="2"
        />
        <text x="55" y="130" textAnchor="middle" fill="#d97706" fontSize="6">
          Digital
        </text>
        <text x="55" y="140" textAnchor="middle" fill="#d97706" fontSize="6">
          Signature
        </text>

        {/* Title */}
        <text
          x="150"
          y="190"
          textAnchor="middle"
          fill="#6b7280"
          fontSize="14"
          fontWeight="medium"
        >
          Digital Forms
        </text>
      </svg>
    ),
  }),
);

export function DigitalForms() {
  return (
    <div className="w-full h-full bg-orange-50 rounded-lg p-4">
      <Suspense fallback={<IllustrationSkeleton title="Digital Forms" />}>
        <DigitalFormsSVG />
      </Suspense>
    </div>
  );
}
