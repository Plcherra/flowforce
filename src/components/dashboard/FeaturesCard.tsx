
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FeaturesCardProps {
  className?: string;
}

export default function FeaturesCard({ className }: FeaturesCardProps = {}) {
  const { t } = useTranslation();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <TrendingUp className="mr-2 h-5 w-5" />
          {t('dashboard.features.title')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.features.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Calendar className="h-5 w-5 text-primary mb-1" />
            <h4 className="font-medium text-sm">{t('dashboard.features.aiInsights')} ✓</h4>
            <p className="text-xs text-muted-foreground">{t('dashboard.features.aiInsightsDesc')}</p>
          </div>
          <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
            <CheckSquare className="h-5 w-5 text-secondary mb-1" />
            <h4 className="font-medium text-sm">{t('dashboard.features.chatAssistant')} ✓</h4>
            <p className="text-xs text-muted-foreground">{t('dashboard.features.chatAssistantDesc')}</p>
          </div>
          <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
            <Clock className="h-5 w-5 text-accent mb-1" />
            <h4 className="font-medium text-sm">{t('dashboard.features.performanceAnalytics')} ✓</h4>
            <p className="text-xs text-muted-foreground">{t('dashboard.features.performanceAnalyticsDesc')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
