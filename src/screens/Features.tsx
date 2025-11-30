
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { 
  Users, 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  FileText, 
  BarChart3 
} from 'lucide-react';
import { EmployeeManagement } from '@/components/illustrations/EmployeeManagement';
import { ShiftScheduling } from '@/components/illustrations/ShiftScheduling';
import { TaskManagement } from '@/components/illustrations/TaskManagement';
import { InternalCommunication } from '@/components/illustrations/InternalCommunication';
import { DigitalForms } from '@/components/illustrations/DigitalForms';
import { AnalyticsReporting } from '@/components/illustrations/AnalyticsReporting';
import { useTranslation } from 'react-i18next';

const features = [
  {
    id: 'employee-management',
    icon: Users,
    titleKey: 'features.employeeManagement.title',
    descriptionKey: 'features.employeeManagement.description',
    detailsKey: 'features.employeeManagement.details',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    illustration: EmployeeManagement
  },
  {
    id: 'shift-scheduling',
    icon: Calendar,
    titleKey: 'features.shiftScheduling.title',
    descriptionKey: 'features.shiftScheduling.description',
    detailsKey: 'features.shiftScheduling.details',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    illustration: ShiftScheduling
  },
  {
    id: 'task-management',
    icon: CheckSquare,
    titleKey: 'features.taskManagement.title',
    descriptionKey: 'features.taskManagement.description',
    detailsKey: 'features.taskManagement.details',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    illustration: TaskManagement
  },
  {
    id: 'internal-communication',
    icon: MessageSquare,
    titleKey: 'features.internalCommunication.title',
    descriptionKey: 'features.internalCommunication.description',
    detailsKey: 'features.internalCommunication.details',
    color: 'text-[#FF4081]',
    bgColor: 'bg-pink-50',
    illustration: InternalCommunication
  },
  {
    id: 'digital-forms',
    icon: FileText,
    titleKey: 'features.digitalForms.title',
    descriptionKey: 'features.digitalForms.description',
    detailsKey: 'features.digitalForms.details',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    illustration: DigitalForms
  },
  {
    id: 'analytics-reporting',
    icon: BarChart3,
    titleKey: 'features.analyticsReporting.title',
    descriptionKey: 'features.analyticsReporting.description',
    detailsKey: 'features.analyticsReporting.details',
    color: 'text-[#3F51B5]',
    bgColor: 'bg-indigo-50',
    illustration: AnalyticsReporting
  },
];

export default function Features() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Back Button */}
        <div className="mb-8">
          <BackButton />
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('features.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="space-y-24">
          {features.map((feature, index) => (
            <section 
              key={feature.id} 
              id={feature.id}
              className="scroll-mt-24"
            >
              <Card className="overflow-hidden border-0 shadow-xl">
                <CardContent className="p-0">
                  <div className={`grid grid-cols-1 lg:grid-cols-2 ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                    <div className={`p-12 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                      <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6`}>
                        <feature.icon className={`h-8 w-8 ${feature.color}`} />
                      </div>
                      <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
                          {t(feature.titleKey)}
                        </CardTitle>
                        <CardDescription className="text-lg text-gray-600">
                          {t(feature.descriptionKey)}
                        </CardDescription>
                      </CardHeader>
                      <p className="text-gray-700 leading-relaxed">
                        {t(feature.detailsKey)}
                      </p>
                    </div>
                    <div className={`p-12 flex items-center justify-center ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                      <div className="w-full h-64">
                        <feature.illustration />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
