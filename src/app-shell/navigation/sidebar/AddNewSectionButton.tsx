import { Plus } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";

interface AddNewSectionButtonProps {
  category: string;
  categoryKey: string;
  onNavigate?: () => void;
}

export function AddNewSectionButton({
  categoryKey,
  onNavigate,
}: AddNewSectionButtonProps) {
  const navigate = useNavigate();

  const handleAddNew = () => {
    onNavigate?.();
    navigate(`/add-section?category=${categoryKey}`);
  };

  return (
    <button
      type="button"
      onClick={handleAddNew}
      className="flex h-full w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 px-2 py-3 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted">
        <Plus className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-center text-xs font-medium">Add new</span>
    </button>
  );
}
