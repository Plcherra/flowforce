
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCan } from '@/hooks/useCan';

interface SectionActionsProps {
  onSelectAll: () => void;
  onDeselectAll: () => void;
  showManageLink?: boolean;
}

export default function SectionActions({ onSelectAll, onDeselectAll, showManageLink = false }: SectionActionsProps) {
  const navigate = useNavigate();
  const { can } = useCan();

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={onSelectAll}>
        <CheckSquare className="h-4 w-4 mr-2" />
        Select All
      </Button>
      <Button variant="outline" size="sm" onClick={onDeselectAll}>
        <Square className="h-4 w-4 mr-2" />
        Deselect All
      </Button>
      {showManageLink && can('systemSettings') && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/sections-permissions')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage All Sections
        </Button>
      )}
    </div>
  );
}
