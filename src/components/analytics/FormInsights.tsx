
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { FormAnalyticsData } from '@/types/common';

interface Insight {
  id: string;
  type: 'improvement' | 'success' | 'warning' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface FormInsightsProps {
  formId: string;
  submissionCount: number;
  completionRate: number;
  fieldData?: FormAnalyticsData['fieldAnalytics'];
}

export default function FormInsights({ 
  formId, 
  submissionCount, 
  completionRate, 
  fieldData = [] 
}: FormInsightsProps) {
  
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Completion rate insights
    if (completionRate < 60) {
      insights.push({
        id: '1',
        type: 'warning',
        title: 'Low Completion Rate',
        description: `Your form has a ${completionRate}% completion rate. Consider reducing the number of fields or making optional fields clearer.`,
        impact: 'high',
        actionable: true
      });
    } else if (completionRate > 85) {
      insights.push({
        id: '2',
        type: 'success',
        title: 'Excellent Completion Rate',
        description: `Great job! Your form has a ${completionRate}% completion rate, which is above industry average.`,
        impact: 'high',
        actionable: false
      });
    }

    // Submission volume insights
    if (submissionCount < 10) {
      insights.push({
        id: '3',
        type: 'improvement',
        title: 'Increase Form Visibility',
        description: 'Your form has received few submissions. Consider promoting it through email campaigns or social media.',
        impact: 'medium',
        actionable: true
      });
    } else if (submissionCount > 100) {
      insights.push({
        id: '4',
        type: 'trend',
        title: 'High Engagement',
        description: `Your form is performing well with ${submissionCount} submissions. Consider creating similar forms.`,
        impact: 'medium',
        actionable: true
      });
    }

    // Field-specific insights
    if (fieldData.length > 10) {
      insights.push({
        id: '5',
        type: 'warning',
        title: 'Form Length Optimization',
        description: 'Your form has many fields. Consider breaking it into multiple steps or removing non-essential fields.',
        impact: 'medium',
        actionable: true
      });
    }

    // Add some general insights
    insights.push({
      id: '6',
      type: 'improvement',
      title: 'Mobile Optimization',
      description: 'Ensure your form is mobile-friendly as 60% of users access forms on mobile devices.',
      impact: 'high',
      actionable: true
    });

    return insights;
  };

  const insights = generateInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'improvement':
        return <Lightbulb className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'improvement':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-orange-500';
      case 'trend':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insights available yet. Submit more data to get recommendations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={getInsightColor(insight.type)}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <h4 className="font-medium">{insight.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getImpactColor(insight.impact)}>
                      {insight.impact} impact
                    </Badge>
                    {insight.actionable && (
                      <Badge variant="outline">Actionable</Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>

                {insight.type === 'improvement' && insight.actionable && (
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Implementation Priority
                    </div>
                    <Progress 
                      value={insight.impact === 'high' ? 85 : insight.impact === 'medium' ? 60 : 30} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h5 className="font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Overall Form Health
          </h5>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            
            <div className="flex justify-between text-sm">
              <span>Engagement Score</span>
              <span className="font-medium">
                {submissionCount > 50 ? '85%' : submissionCount > 20 ? '70%' : '45%'}
              </span>
            </div>
            <Progress 
              value={submissionCount > 50 ? 85 : submissionCount > 20 ? 70 : 45} 
              className="h-2" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
