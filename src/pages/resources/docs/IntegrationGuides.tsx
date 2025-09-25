
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '@/components/resources/Breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Puzzle, Clock } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { useToast } from '@/hooks/use-toast';
import { IntegrationCard } from '@/components/resources/integrations/IntegrationCard';
import { CustomIntegrationsSection } from '@/components/resources/integrations/CustomIntegrationsSection';
import { GettingStartedSection } from '@/components/resources/integrations/GettingStartedSection';
import { integrations } from '@/data/integrations';

export default function IntegrationGuides() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const breadcrumbItems = [
    { label: t('landing.resources'), href: '/resources' },
    { label: t('resources.documentation.title'), href: '/resources' },
    { label: 'Integration Guides' },
  ];

  const handleStartIntegration = (integrationName: string) => {
    toast({
      title: "Integration Started",
      description: `Starting ${integrationName} integration setup. You would typically be redirected to the integration flow or settings page.`,
    });
    
    // Here you would typically redirect to the actual integration page or open a modal
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumbs items={breadcrumbItems} />
          <BackButton />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Puzzle className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <CardTitle className="text-2xl">Integration Guides</CardTitle>
                  <CardDescription className="mt-2">
                    Connect FlowForce with your existing tools
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Tutorial</Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  15 min
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3>Popular Integrations</h3>
              <p>
                FlowForce integrates seamlessly with popular business tools to streamline your workflow. 
                Choose from our pre-built integrations or create custom connections using our API.
              </p>
              
              <div className="space-y-8 mt-8">
                {integrations.map((integration, index) => (
                  <IntegrationCard 
                    key={index} 
                    integration={integration} 
                    onStartIntegration={handleStartIntegration}
                  />
                ))}
              </div>

              <CustomIntegrationsSection />
              <GettingStartedSection />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
