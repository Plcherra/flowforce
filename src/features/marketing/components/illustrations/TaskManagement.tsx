import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const TaskManagementSVG = lazy(() =>
  Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="hsl(var(--secondary))" />

        {/* Clipboard */}
        <rect
          x="100"
          y="40"
          width="100"
          height="120"
          fill="white"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          rx="4"
        />
        <rect x="120" y="30" width="60" height="20" fill="hsl(var(--secondary))" rx="3" />

        {/* Checkboxes and tasks */}
        <rect x="115" y="60" width="12" height="12" fill="hsl(var(--success))" rx="2" />
        <text x="135" y="70" fill="hsl(var(--foreground))" fontSize="10">
          Task completed
        </text>
        <path
          d="M119 64 L121 66 L125 62"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />

        <rect x="115" y="80" width="12" height="12" fill="hsl(var(--success))" rx="2" />
        <text x="135" y="90" fill="hsl(var(--foreground))" fontSize="10">
          Review reports
        </text>
        <path
          d="M119 84 L121 86 L125 82"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />

        <rect
          x="115"
          y="100"
          width="12"
          height="12"
          fill="white"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          rx="2"
        />
        <text x="135" y="110" fill="hsl(var(--muted-foreground))" fontSize="10">
          Pending task
        </text>

        <rect
          x="115"
          y="120"
          width="12"
          height="12"
          fill="white"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          rx="2"
        />
        <text x="135" y="130" fill="hsl(var(--muted-foreground))" fontSize="10">
          Future task
        </text>

        {/* Progress indicator */}
        <rect x="115" y="145" width="70" height="4" fill="hsl(var(--muted))" rx="2" />
        <rect x="115" y="145" width="35" height="4" fill="hsl(var(--secondary))" rx="2" />

        {/* Title */}
        <text
          x="150"
          y="180"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="14"
          fontWeight="medium"
        >
          Task Management
        </text>
      </svg>
    ),
  }),
);

export function TaskManagement() {
  return (
    <div className="w-full h-full bg-secondary/10 rounded-lg p-4">
      <Suspense fallback={<IllustrationSkeleton title="Task Management" />}>
        <TaskManagementSVG />
      </Suspense>
    </div>
  );
}
