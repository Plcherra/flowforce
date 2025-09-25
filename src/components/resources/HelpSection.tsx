
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HelpSection() {
  const { t } = useTranslation();

  return (
    <section className="mt-16 pt-16 border-t border-gray-200">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mr-4">
          <HelpCircle className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('resources.help.title')}</h2>
          <p className="text-gray-600">{t('resources.help.subtitle')}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle>{t('resources.help.contactSupport.title')}</CardTitle>
            <CardDescription>{t('resources.help.contactSupport.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{t('resources.help.contactSupport.content')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle>{t('resources.help.communityForum.title')}</CardTitle>
            <CardDescription>{t('resources.help.communityForum.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{t('resources.help.communityForum.content')}</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle>{t('resources.help.scheduleDemo.title')}</CardTitle>
            <CardDescription>{t('resources.help.scheduleDemo.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{t('resources.help.scheduleDemo.content')}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
