
import { Button } from '@/components/ui/button';

type ViewType = 'month' | 'week' | 'day' | 'year';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isMobile?: boolean;
}

export function ViewSelector({ currentView, onViewChange, isMobile = false }: ViewSelectorProps) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Button
            variant={currentView === 'day' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => onViewChange('day')}
          >
            Day
          </Button>
          <Button
            variant={currentView === 'week' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => onViewChange('week')}
          >
            Week
          </Button>
          <Button
            variant={currentView === 'month' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => onViewChange('month')}
          >
            Month
          </Button>
        </div>
        
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Published</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Draft</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Understaffed</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button
          variant={currentView === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('day')}
        >
          Day
        </Button>
        <Button
          variant={currentView === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('week')}
        >
          Week
        </Button>
        <Button
          variant={currentView === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('month')}
        >
          Month
        </Button>
        <Button
          variant={currentView === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('year')}
        >
          Year
        </Button>
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Published</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Draft</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Understaffed</span>
        </div>
      </div>
    </div>
  );
}
