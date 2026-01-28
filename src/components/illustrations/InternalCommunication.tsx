import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const InternalCommunicationSVG = lazy(() =>
  Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="#fef7f7" />

        {/* Chat bubbles */}
        <rect x="50" y="60" width="80" height="30" fill="#FF4081" rx="15" />
        <text x="90" y="78" textAnchor="middle" fill="white" fontSize="10">
          Hello team!
        </text>
        <polygon points="130,85 140,90 130,95" fill="#FF4081" />

        <rect x="170" y="100" width="80" height="30" fill="#e5e7eb" rx="15" />
        <text x="210" y="118" textAnchor="middle" fill="#374151" fontSize="10">
          Got it, thanks
        </text>
        <polygon points="170,125 160,130 170,135" fill="#e5e7eb" />

        {/* Team icons */}
        <circle cx="70" cy="40" r="8" fill="#FF4081" />
        <circle cx="230" cy="150" r="8" fill="#6b7280" />

        {/* Message indicator */}
        <circle cx="250" cy="70" r="15" fill="#22c55e" />
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
          fill="#6b7280"
          fontSize="14"
          fontWeight="medium"
        >
          Internal Communication
        </text>
      </svg>
    ),
  }),
);

export function InternalCommunication() {
  return (
    <div className="w-full h-full bg-pink-50 rounded-lg p-4">
      <Suspense
        fallback={<IllustrationSkeleton title="Internal Communication" />}
      >
        <InternalCommunicationSVG />
      </Suspense>
    </div>
  );
}
