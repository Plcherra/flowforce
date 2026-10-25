import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface TasksBoardSwitchProps {
  mode: "shift" | "all";
  onChange: (mode: "shift" | "all") => void;
}

export function TasksBoardSwitch({ mode, onChange }: TasksBoardSwitchProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="tasks-board-switch">
      <Button
        type="button"
        variant={mode === "shift" ? "default" : "outline"}
        className="min-h-11 px-2 text-sm"
        data-testid="tasks-mode-shift"
        onClick={() => onChange("shift")}
      >
        {t("tasks.myShift")}
      </Button>
      <Button
        type="button"
        variant={mode === "all" ? "default" : "outline"}
        className="min-h-11 px-2 text-sm"
        data-testid="tasks-mode-all"
        onClick={() => onChange("all")}
      >
        {t("tasks.allTasks")}
      </Button>
    </div>
  );
}
