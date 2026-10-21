import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";

interface AddNewSectionButtonProps {
  category: string;
  categoryKey: string;
  onNavigate?: () => void;
}

export function AddNewSectionButton({
  category,
  categoryKey,
  onNavigate,
}: AddNewSectionButtonProps) {
  const navigate = useNavigate();

  const handleAddNew = () => {
    onNavigate?.();
    navigate(`/add-section?category=${categoryKey}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-1"
      onClick={handleAddNew}
    >
      <Plus className="mr-2 h-3 w-3" />
      <span className="text-xs">Add new</span>
    </Button>
  );
}
