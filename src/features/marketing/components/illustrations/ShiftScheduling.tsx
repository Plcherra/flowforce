import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const ShiftSchedulingSVG = lazy(() =>
  Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="hsl(var(--success))" />

        {/* Calendar Grid */}
        <rect
          x="40"
          y="40"
          width="160"
          height="120"
          fill="white"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Calendar Header */}
        <rect x="40" y="40" width="160" height="25" fill="hsl(var(--success))" />
        <text
          x="120"
          y="57"
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          Schedule
        </text>

        {/* Calendar Days */}
        <line
          x1="60"
          y1="65"
          x2="60"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />
        <line
          x1="80"
          y1="65"
          x2="80"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />
        <line
          x1="100"
          y1="65"
          x2="100"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />
        <line
          x1="120"
          y1="65"
          x2="120"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />
        <line
          x1="140"
          y1="65"
          x2="140"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />
        <line
          x1="160"
          y1="65"
          x2="160"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />
        <line
          x1="180"
          y1="65"
          x2="180"
          y2="160"
          stroke="hsl(var(--muted))"
          strokeWidth="1"
        />

        {/* Shifts */}
        <rect x="45" y="80" width="30" height="15" fill="hsl(var(--primary))" rx="2" />
        <rect x="85" y="100" width="30" height="15" fill="hsl(var(--destructive))" rx="2" />
        <rect x="125" y="120" width="30" height="15" fill="hsl(var(--secondary))" rx="2" />

        {/* Clock */}
        <circle
          cx="230"
          cy="100"
          r="30"
          fill="white"
          stroke="hsl(var(--success))"
          strokeWidth="3"
        />
        <line
          x1="230"
          y1="100"
          x2="230"
          y2="85"
          stroke="hsl(var(--success))"
          strokeWidth="2"
        />
        <line
          x1="230"
          y1="100"
          x2="240"
          y2="100"
          stroke="hsl(var(--success))"
          strokeWidth="2"
        />

        {/* Title */}
        <text
          x="150"
          y="180"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="14"
          fontWeight="medium"
        >
          Shift Scheduling
        </text>
      </svg>
    ),
  }),
);

export function ShiftScheduling() {
  return (
    <div className="w-full h-full bg-success-muted rounded-lg p-4">
      <Suspense fallback={<IllustrationSkeleton title="Shift Scheduling" />}>
        <ShiftSchedulingSVG />
      </Suspense>
    </div>
  );
}
