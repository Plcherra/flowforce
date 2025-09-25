import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, Settings, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function QuickSetupSteps() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: UserPlus,
      step: '01',
      titleKey: 'landing.quickSetup.signUp.title',
      descriptionKey: 'landing.quickSetup.signUp.description',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: Settings,
      step: '02',
      titleKey: 'landing.quickSetup.configure.title',
      descriptionKey: 'landing.quickSetup.configure.description',
      color: 'text-[#FF4081]',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    },
    {
      icon: Rocket,
      step: '03',
      titleKey: 'landing.quickSetup.goLive.title',
      descriptionKey: 'landing.quickSetup.goLive.description',
      color: 'text-[#3F51B5]',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('landing.quickSetup.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('landing.quickSetup.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Lines - Hidden on Mobile */}
          <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="flex justify-between items-center px-8">
              <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-200 to-pink-200"></div>
              <div className="w-4"></div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-pink-200 to-indigo-200"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <Card 
                key={index}
                className={`group relative border-2 ${step.borderColor} hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-white`}
              >
                <CardContent className="p-8 text-center">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className={`w-8 h-8 ${step.bgColor} ${step.borderColor} border-2 rounded-full flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${step.color}`}>{step.step}</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={`w-20 h-20 ${step.bgColor} rounded-3xl flex items-center justify-center mx-auto mb-6 mt-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <step.icon className={`h-10 w-10 ${step.color}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#3F51B5] transition-colors">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {t(step.descriptionKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-[#3F51B5]/10 text-[#3F51B5] text-lg font-semibold">
            <span className="w-3 h-3 bg-[#3F51B5] rounded-full mr-3 animate-pulse"></span>
            {t('landing.averageSetup')}
          </div>
        </div>
      </div>
    </section>
  );
}