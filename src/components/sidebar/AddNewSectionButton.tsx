import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AddNewSectionButtonProps {
  category: string;
  categoryKey: string;
}

export function AddNewSectionButton({ category, categoryKey }: AddNewSectionButtonProps) {
  const navigate = useNavigate();

  const handleAddNew = () => {
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