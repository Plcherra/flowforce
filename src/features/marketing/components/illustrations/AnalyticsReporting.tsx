import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const AnalyticsReportingSVG = lazy(() =>
  Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="#f0f9ff" />

        {/* Dashboard screen */}
        <rect
          x="50"
          y="40"
          width="200"
          height="120"
          fill="white"
          stroke="#d1d5db"
          strokeWidth="2"
          rx="4"
        />

        {/* Charts */}
        <rect
          x="70"
          y="60"
          width="60"
          height="40"
          fill="#e0f2fe"
          stroke="#0891b2"
          strokeWidth="1"
          rx="2"
        />
        <rect x="75" y="85" width="10" height="10" fill="#0891b2" />
        <rect x="90" y="80" width="10" height="15" fill="#0891b2" />
        <rect x="105" y="75" width="10" height="20" fill="#0891b2" />
        <rect x="120" y="70" width="10" height="25" fill="#0891b2" />

        {/* Pie chart */}
        <circle
          cx="190"
          cy="80"
          r="20"
          fill="#dbeafe"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <path d="M190 60 A20 20 0 0 1 210 80 L190 80 Z" fill="#3b82f6" />
        <path d="M210 80 A20 20 0 0 1 190 100 L190 80 Z" fill="#1d4ed8" />

        {/* Data table */}
        <rect
          x="70"
          y="110"
          width="160"
          height="30"
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <line
          x1="70"
          y1="120"
          x2="230"
          y2="120"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <line
          x1="120"
          y1="110"
          x2="120"
          y2="140"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <line
          x1="180"
          y1="110"
          x2="180"
          y2="140"
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        <text x="95" y="117" textAnchor="middle" fill="#374151" fontSize="8">
          Metric
        </text>
        <text x="150" y="117" textAnchor="middle" fill="#374151" fontSize="8">
          Value
        </text>
        <text x="205" y="117" textAnchor="middle" fill="#374151" fontSize="8">
          Trend
        </text>

        <text x="95" y="130" textAnchor="middle" fill="#6b7280" fontSize="7">
          Sales
        </text>
        <text x="150" y="130" textAnchor="middle" fill="#6b7280" fontSize="7">
          $12.5k
        </text>
        <text x="205" y="130" textAnchor="middle" fill="#10b981" fontSize="7">
          ↗ +15%
        </text>

        {/* Title */}
        <text
          x="150"
          y="185"
          textAnchor="middle"
          fill="#6b7280"
          fontSize="14"
          fontWeight="medium"
        >
          Analytics & Reporting
        </text>
      </svg>
    ),
  }),
);

export function AnalyticsReporting() {
  return (
    <div className="w-full h-full bg-blue-50 rounded-lg p-4">
      <Suspense
        fallback={<IllustrationSkeleton title="Analytics & Reporting" />}
      >
        <AnalyticsReportingSVG />
      </Suspense>
    </div>
  );
}
