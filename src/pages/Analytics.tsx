import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormAnalytics from '@/components/analytics/FormAnalytics';
import FormInsights from '@/components/analytics/FormInsights';
import AIAssistant from '@/components/ai/AIAssistant';
import { useIsMobile } from '@/hooks/use-mobile';
import { BarChart, Bot, Lightbulb, TrendingUp } from 'lucide-react';

export default function Analytics() {
  const isMobile = useIsMobile();
  const [selectedForm, setSelectedForm] = useState<string>('');

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      <div className={`${isMobile ? 'px-4 py-3' : 'flex justify-between items-center'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Analytics & AI</h1>
          <p className="text-muted-foreground">
            Analyze form performance and get AI-powered insights
          </p>
        </div>
      </div>

      <div className={isMobile ? 'px-4' : ''}>
        <Tabs defaultValue="analytics" className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto flex-col space-y-1' : 'grid-cols-3'}`}>
            <TabsTrigger value="analytics" className={`${isMobile ? 'w-full justify-start' : 'flex items-center gap-2'}`}>
              <BarChart className="h-4 w-4" />
              <span className={isMobile ? 'ml-2' : ''}>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className={`${isMobile ? 'w-full justify-start' : 'flex items-center gap-2'}`}>
              <Lightbulb className="h-4 w-4" />
              <span className={isMobile ? 'ml-2' : ''}>Insights</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className={`${isMobile ? 'w-full justify-start' : 'flex items-center gap-2'}`}>
              <Bot className="h-4 w-4" />
              <span className={isMobile ? 'ml-2' : ''}>AI Assistant</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <FormAnalytics />
          </TabsContent>

          <TabsContent value="insights" className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}`}>
              <div className={isMobile ? '' : 'lg:col-span-2'}>
                <FormInsights 
                  formId={selectedForm}
                  submissionCount={42}
                  completionRate={87}
                  fieldData={[]}
                />
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">87%</div>
                      <div className="text-sm text-muted-foreground">Avg. Completion Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">3.2m</div>
                      <div className="text-sm text-muted-foreground">Avg. Time to Complete</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">156</div>
                      <div className="text-sm text-muted-foreground">Total Submissions Today</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
            <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}`}>
              <AIAssistant 
                formData={{}}
                submissionData={[]}
                onSuggestion={(suggestion) => {/* TODO: Handle AI suggestion */}}
              />
              <Card>
                <CardHeader>
                  <CardTitle>AI Capabilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <div>
                        <h4 className="font-medium">Form Optimization</h4>
                        <p className="text-sm text-muted-foreground">
                          Get recommendations to improve form completion rates and user experience
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                      <div>
                        <h4 className="font-medium">Data Analysis</h4>
                        <p className="text-sm text-muted-foreground">
                          Understand submission patterns and user behavior insights
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                      <div>
                        <h4 className="font-medium">Field Suggestions</h4>
                        <p className="text-sm text-muted-foreground">
                          Get intelligent field type and layout recommendations
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                      <div>
                        <h4 className="font-medium">Conversion Tips</h4>
                        <p className="text-sm text-muted-foreground">
                          Learn strategies to increase form submissions and engagement
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}