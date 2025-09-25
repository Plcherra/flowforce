
import { CheckCircle } from 'lucide-react';

interface IntegrationStepProps {
  step: string;
  index: number;
}

export function IntegrationStep({ step, index }: IntegrationStepProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
        <span className="text-xs font-medium text-blue-600">{index + 1}</span>
      </div>
      <p className="text-gray-700 text-sm">{step}</p>
    </div>
  );
}
