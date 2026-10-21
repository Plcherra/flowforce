import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TaskCreateMenuProps {
  onCreateCustom: () => void;
}

export function TaskCreateMenu({ onCreateCustom }: TaskCreateMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Create"
          data-testid="tasks-create-button"
          className="above-bottom-icon-nav fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg print:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-56 p-2"
        data-testid="tasks-create-menu"
      >
        <button
          type="button"
          className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-primary/10"
          onClick={() => {
            setOpen(false);
            onCreateCustom();
          }}
        >
          New custom task
        </button>
      </PopoverContent>
    </Popover>
  );
}
