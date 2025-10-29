
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sparkles, RefreshCw, Brain, TrendingUp, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCan } from '@/hooks/useCan';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import AIActionsFeed from '@/components/ai/AIActionsFeed';
import { ClosedLoopSummary } from '@/components/ai/ClosedLoopSummary';
import { useClosedLoopState } from '@/hooks/useClosedLoopState';
import { cn } from '@/lib/utils';

interface AIInsightsPanelProps {
  type: 'dashboard' | 'scheduler' | 'expenses' | 'reports';
  context?: string;
  className?: string;
}

export default function AIInsightsPanel({ type, context, className }: AIInsightsPanelProps) {
  const { can } = useCan();
  const { toast } = useToast();
  const navigate = useNavigate();
  const actionsFeedEnabled = useFeatureFlag('intelligence.oodaLoop');
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(0); // 0 = manual, 30, 60, 300 seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const {
    data: closedLoopState,
    isLoading: closedLoopLoading,
    isError: closedLoopErrorFlag,
    error: closedLoopError,
    refetch: refetchClosedLoop,
  } = useClosedLoopState({ rangeDays: type === 'dashboard' ? 14 : 7, aiType: type });
  const closedLoopLoadingState = closedLoopLoading && !closedLoopState;
  const closedLoopErrorInstance = closedLoopErrorFlag ? closedLoopError : null;

  const handleClosedLoopRefresh = useCallback(() => {
    void refetchClosedLoop();
  }, [refetchClosedLoop]);

  const fetchInsights = useCallback(async () => {
    if (!mountedRef.current || !can('viewAIInsights')) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { type, context }
      });

      if (error) throw error;
      
      if (mountedRef.current) {
        setInsights(data.insights);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      if (mountedRef.current) {
        setInsights('Unable to generate insights at this time. Please try again later.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [type, context, can]);

  // Auto-refresh functionality
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set interval if refreshInterval > 0 and user has permission
    if (can('viewAIInsights') && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchInsights();
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, can, fetchInsights]);

  // Initial fetch
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'performance':
        navigate('/analytics');
        toast({
          title: "Performance Analytics",
          description: "Opening performance dashboard..."
        });
        break;
      case 'efficiency':
        navigate('/reports');
        toast({
          title: "Efficiency Reports",
          description: "Viewing efficiency metrics..."
        });
        break;
      case 'issues':
        navigate('/tasks');
        toast({
          title: "Task Management",
          description: "Found 3 areas to improve - opening task management..."
        });
        break;
      case 'trending':
        navigate('/analytics');
        toast({
          title: "Trending Analytics",
          description: "Viewing trending data and insights..."
        });
        break;
    }
  };

  const handleViewDetailedAnalysis = () => {
    navigate('/ai-insights');
    toast({
      title: "AI Insights",
      description: "Opening detailed AI analysis..."
    });
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'dashboard': return 'Operations Overview';
      case 'scheduler': return 'Scheduling Insights';
      case 'expenses': return 'Financial Analysis';
      case 'reports': return 'Report Intelligence';
      default: return 'AI Insights';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'dashboard': return <TrendingUp className="h-4 w-4" />;
      case 'scheduler': return <Brain className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  // Only show AI insights if user has permission - but do this AFTER all hooks
  if (!can('viewAIInsights')) {
    return null;
  }

  const showActionsFeed = actionsFeedEnabled && (type === 'reports' || type === 'dashboard');

  const insightsCard = (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              {getTypeIcon()}
              AI Insights
            </CardTitle>
            <Badge variant="secondary" className="text-xs w-fit">
              {getTypeLabel()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setRefreshInterval(0)}>
                  <span className="flex-1">Manual</span>
                  {refreshInterval === 0 && <div className="w-2 h-2 bg-primary rounded-full" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRefreshInterval(30)}>
                  <span className="flex-1">30 seconds</span>
                  {refreshInterval === 30 && <div className="w-2 h-2 bg-primary rounded-full" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRefreshInterval(60)}>
                  <span className="flex-1">1 minute</span>
                  {refreshInterval === 60 && <div className="w-2 h-2 bg-primary rounded-full" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRefreshInterval(300)}>
                  <span className="flex-1">5 minutes</span>
                  {refreshInterval === 300 && <div className="w-2 h-2 bg-primary rounded-full" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsights}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            <div className="animate-pulse h-4 bg-muted rounded"></div>
            <div className="animate-pulse h-4 bg-muted rounded w-5/6"></div>
            <div className="animate-pulse h-4 bg-muted rounded w-4/6"></div>
            <div className="animate-pulse h-4 bg-muted rounded w-3/6"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleCardClick('performance')}
                className="p-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">Performance</span>
                  <Badge variant="secondary" className="text-xs">88%</Badge>
                </div>
                <div className="mt-2 w-full bg-primary/10 rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </button>
              
              <button 
                onClick={() => handleCardClick('efficiency')}
                className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-700">Efficiency</span>
                  <Badge variant="secondary" className="text-xs">92%</Badge>
                </div>
                <div className="mt-2 w-full bg-green-100 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </button>
              
              <button 
                onClick={() => handleCardClick('issues')}
                className="p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-orange-700">Areas to Improve</span>
                  <Badge variant="outline" className="text-xs">3</Badge>
                </div>
                <p className="text-xs text-orange-600 mt-1">Focus needed</p>
              </button>
              
              <button 
                onClick={() => handleCardClick('trending')}
                className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700">Trending</span>
                  <Badge variant="secondary" className="text-xs">↗ +5%</Badge>
                </div>
                <p className="text-xs text-blue-600 mt-1">This week</p>
              </button>
            </div>

            {/* Quick Insights */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">Schedule adherence is strong</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-muted-foreground">Task completion could improve</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">Team productivity is on track</span>
              </div>
            </div>

            {insights && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                {insights}
              </div>
            )}

            {/* Action Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs h-7"
              onClick={handleViewDetailedAnalysis}
            >
              View Detailed Analysis
            </Button>

            {lastUpdated && (
              <div className="flex items-center justify-center pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const containerClass = cn('space-y-4', className);

  if (!showActionsFeed) {
    return (
      <div className={containerClass}>
        {insightsCard}
        <ClosedLoopSummary
          loading={closedLoopLoadingState}
          error={closedLoopErrorInstance}
          state={closedLoopState}
          onRefresh={handleClosedLoopRefresh}
        />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {insightsCard}
      <ClosedLoopSummary
        loading={closedLoopLoadingState}
        error={closedLoopErrorInstance}
        state={closedLoopState}
        onRefresh={handleClosedLoopRefresh}
      />
      <AIActionsFeed />
    </div>
  );
}
