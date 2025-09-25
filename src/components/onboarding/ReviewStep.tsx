
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { BusinessTemplate, OnboardingPosition } from '@/types/templates';

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

interface ReviewStepProps {
  selectedTemplate: BusinessTemplate;
  enabledSections: string[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
}

export default function ReviewStep({ 
  selectedTemplate, 
  enabledSections, 
  customRoles, 
  positions 
}: ReviewStepProps) {
  return (
    <div>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center">
          <CheckCircle className="mr-2 h-6 w-6" />
          Review Your Configuration
        </CardTitle>
        <CardDescription>
          Review your workspace configuration before completing setup
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Business Template</h4>
          <div className="flex items-center space-x-3">
            <Badge className="bg-green-100 text-green-800">
              {selectedTemplate.name}
            </Badge>
            <span className="text-sm text-gray-600">
              {selectedTemplate.industry} industry
            </span>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">
            Enabled Sections ({enabledSections.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {enabledSections.map((sectionId) => (
              <Badge key={sectionId} variant="outline" className="text-xs">
                {sectionId.replace('-', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">
            Your Company Roles ({customRoles.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {customRoles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">
            Total Positions ({positions.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {positions.map((position) => (
              <Badge key={position.id} variant="outline" className="text-xs">
                {position.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
