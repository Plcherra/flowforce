import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface IdeaMetricCardProps {
  title: string;
  value: string | number;
  delta?: number | null;
  unit?: string | null;
  icon?: React.ReactNode;
  className?: string;
  description?: string;
}

export function IdeaMetricCard({
  title,
  value,
  delta,
  unit,
  icon,
  className,
  description,
}: IdeaMetricCardProps) {
  const formattedDelta =
    typeof delta === "number"
      ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${unit ? ` ${unit}` : ""}`
      : null;

  return (
    <Card
      className={cn(
        "border-border/60 bg-background/80 shadow-sm backdrop-blur",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
          {unit && typeof value === "number" ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </div>
        {formattedDelta ? (
          <p
            className={cn(
              "text-xs font-medium",
              delta && delta >= 0 ? "text-emerald-500" : "text-rose-500",
            )}
          >
            {formattedDelta}
          </p>
        ) : null}
        {description ? (
          <p className="mt-2 text-xs text-muted-foreground leading-snug">
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default IdeaMetricCard;
