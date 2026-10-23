import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";

interface TasksBoardSwitchProps {
  mode: "shift" | "all" | "setup";
  showSetup: boolean;
  onChange: (mode: "shift" | "all" | "setup") => void;
}

export function TasksBoardSwitch({ mode, showSetup, onChange }: TasksBoardSwitchProps) {
  const { t } = useTranslation();
  return (
    <div
      className={showSetup ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}
      data-testid="tasks-board-switch"
    >
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
      {showSetup ? (
        <Button
          type="button"
          variant={mode === "setup" ? "default" : "outline"}
          className="min-h-11 px-2 text-sm"
          data-testid="tasks-mode-setup"
          onClick={() => onChange("setup")}
        >
          {t("tasks.setup")}
        </Button>
      ) : null}
    </div>
  );
}
