import { lazy, Suspense } from "react";
import { IllustrationSkeleton } from "@/components/ui/illustration-skeleton";

const EmployeeManagementSVG = lazy(() =>
  Promise.resolve({
    default: () => (
      <svg
        viewBox="0 0 300 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="300" height="200" fill="hsl(var(--primary))" />

        {/* People Icons */}
        <g transform="translate(50, 40)">
          <circle cx="25" cy="20" r="12" fill="hsl(var(--primary))" />
          <rect x="15" y="32" width="20" height="25" fill="hsl(var(--primary))" rx="3" />
        </g>

        <g transform="translate(150, 40)">
          <circle cx="25" cy="20" r="12" fill="hsl(var(--success))" />
          <rect x="15" y="32" width="20" height="25" fill="hsl(var(--success))" rx="3" />
        </g>

        <g transform="translate(100, 100)">
          <circle cx="25" cy="20" r="12" fill="hsl(var(--warning))" />
          <rect x="15" y="32" width="20" height="25" fill="hsl(var(--warning))" rx="3" />
        </g>

        {/* Org Chart Lines */}
        <line
          x1="75"
          y1="80"
          x2="125"
          y2="120"
          stroke="hsl(var(--muted))"
          strokeWidth="2"
        />
        <line
          x1="175"
          y1="80"
          x2="125"
          y2="120"
          stroke="hsl(var(--muted))"
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
          Employee Management
        </text>
      </svg>
    ),
  }),
);

export function EmployeeManagement() {
  return (
    <div className="w-full h-full bg-primary/10 rounded-lg p-4">
      <Suspense fallback={<IllustrationSkeleton title="Employee Management" />}>
        <EmployeeManagementSVG />
      </Suspense>
    </div>
  );
}
