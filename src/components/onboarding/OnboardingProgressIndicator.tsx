import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface OnboardingProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completionProgress: number;
  enabledSectionCount: number;
  totalSections: number;
  hasRequiredRoles: boolean;
}

export const OnboardingProgressIndicator = memo(function OnboardingProgressIndicator({
  currentStep,
  totalSteps,
  completionProgress,
  enabledSectionCount,
  totalSections,
  hasRequiredRoles
}: OnboardingProgressIndicatorProps) {
  const getProgressIcon = () => {
    if (completionProgress === 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (completionProgress > 50) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {getProgressIcon()}
      <span className="font-medium">{completionProgress}% Complete</span>
      
      <div className="flex gap-1 ml-2">
        <Badge variant="outline" className="text-xs">
          Step {currentStep}/{totalSteps}
        </Badge>
        
        {enabledSectionCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {enabledSectionCount} sections
          </Badge>
        )}
        
        {hasRequiredRoles && (
          <Badge variant="secondary" className="text-xs text-green-600">
            Roles configured
          </Badge>
        )}
      </div>
    </div>
  );
});