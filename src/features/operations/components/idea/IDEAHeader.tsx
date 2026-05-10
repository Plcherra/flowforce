import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarRange, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIdeaContext } from "@/features/operations/contexts/IdeaProvider";

interface IDEAHeaderProps {
  onRefresh?: () => void;
  stageLoading?: boolean;
  children?: React.ReactNode;
}

const RANGE_PRESETS: Record<string, number> = {
  "last-7-days": 7,
  "last-14-days": 14,
  "last-30-days": 30,
};

export function IDEAHeader({
  onRefresh,
  stageLoading = false,
  children,
}: IDEAHeaderProps) {
  const { range, setRange } = useIdeaContext();

  const activePreset = useMemo<string>(() => {
    const now = new Date();
    const diffInMs = now.getTime() - range.start.getTime();
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

    const presetEntry = Object.entries(RANGE_PRESETS).find(
      ([, days]) => days === diffInDays,
    );
    return presetEntry?.[0] ?? "custom";
  }, [range.start]);

  const handlePresetChange = (value: string) => {
    const days = RANGE_PRESETS[value];
    if (!days) return;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setRange({ start, end });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Operations Intelligence (IDEA)
          </h1>
          <p className="text-sm text-muted-foreground">
            Navigate the Identify → Diagnose → Execute → Assess loop to drive
            continuous improvement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span>
              {format(range.start, "MMM d, yyyy")} –{" "}
              {format(range.end, "MMM d, yyyy")}
            </span>
          </div>
          <Select
            value={activePreset === "custom" ? undefined : activePreset}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Custom range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-14-days">Last 14 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={stageLoading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

export default IDEAHeader;
