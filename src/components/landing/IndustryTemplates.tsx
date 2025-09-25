import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, UtensilsCrossed, Heart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const industries = [
  {
    icon: Store,
    titleKey: 'landing.industries.retail.title',
    descriptionKey: 'landing.industries.retail.description',
    featuresKeys: ['landing.industries.retail.features.alerts', 'landing.industries.retail.features.tracking', 'landing.industries.retail.features.automation'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: UtensilsCrossed,
    titleKey: 'landing.industries.hospitality.title',
    descriptionKey: 'landing.industries.hospitality.description',
    featuresKeys: ['landing.industries.hospitality.features.kitchen', 'landing.industries.hospitality.features.scheduling', 'landing.industries.hospitality.features.feedback'],
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: Heart,
    titleKey: 'landing.industries.healthcare.title',
    descriptionKey: 'landing.industries.healthcare.description',
    featuresKeys: ['landing.industries.healthcare.features.compliance', 'landing.industries.healthcare.features.tracking', 'landing.industries.healthcare.features.alerts'],
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    gradient: 'from-green-500 to-emerald-600'
  }
];

export function IndustryTemplates() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('landing.industries.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('landing.industries.subtitle')}
          </p>
        </div>

        {/* Industry Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {industries.map((industry, index) => (
            <Card 
              key={index}
              className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${industry.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
              
              <CardContent className="p-8 relative">
                {/* Icon */}
                <div className={`w-20 h-20 bg-gradient-to-br ${industry.gradient} rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <industry.icon className="h-10 w-10 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#3F51B5] transition-colors">
                  {t(industry.titleKey)}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {t(industry.descriptionKey)}
                </p>

                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  {industry.featuresKeys.map((featureKey, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-600">
                      <div className={`w-2 h-2 ${industry.bgColor} rounded-full mr-3`}></div>
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button 
                  variant="outline" 
                  className="w-full border-2 border-[#3F51B5] text-[#3F51B5] hover:bg-[#3F51B5] hover:text-white group/btn transition-all duration-300"
                  onClick={() => navigate(`/templates/${t(industry.titleKey).toLowerCase()}`)}
                >
                  {t('landing.industries.explore')} {t(industry.titleKey)} {t('landing.industries.template')}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
