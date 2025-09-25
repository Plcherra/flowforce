import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Users,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ComplianceViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  employee?: {
    name: string;
    id: string;
  };
  date: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

interface ComplianceRule {
  id: string;
  rule_type: string;
  value: number;
  role?: string;
  is_active: boolean;
  description: string;
}

interface ComplianceMetrics {
  overallScore: number;
  weeklyHoursCompliance: number;
  dailyHoursCompliance: number;
  breakCompliance: number;
  overtimeHours: number;
  totalViolations: number;
  criticalViolations: number;
}

export function ComplianceMonitor() {
  const { toast } = useToast();
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      // For now, simulate compliance rules until types are regenerated
      const mockRules: ComplianceRule[] = [
        {
          id: '1',
          rule_type: 'daily_hours',
          value: 8,
          is_active: true,
          description: 'Maximum 8 hours per day'
        },
        {
          id: '2',
          rule_type: 'weekly_hours', 
          value: 40,
          is_active: true,
          description: 'Maximum 40 hours per week'
        }
      ];

      // Simulate violations and metrics for demo
      const mockViolations: ComplianceViolation[] = [
        {
          id: '1',
          type: 'Daily Hours Exceeded',
          severity: 'high',
          message: 'Sarah Johnson worked 11 hours on March 15, exceeding the 10-hour daily limit',
          employee: { name: 'Sarah Johnson', id: 'emp1' },
          date: '2024-03-15',
          status: 'active'
        },
        {
          id: '2',
          type: 'Break Compliance',
          severity: 'medium',
          message: 'Mike Chen had insufficient break time during 8-hour shift',
          employee: { name: 'Mike Chen', id: 'emp2' },
          date: '2024-03-14',
          status: 'acknowledged'
        },
        {
          id: '3',
          type: 'Weekly Hours Exceeded',
          severity: 'critical',
          message: 'Lisa Wong has worked 45 hours this week, exceeding 40-hour limit',
          employee: { name: 'Lisa Wong', id: 'emp3' },
          date: '2024-03-13',
          status: 'active'
        }
      ];

      const mockMetrics: ComplianceMetrics = {
        overallScore: 87,
        weeklyHoursCompliance: 92,
        dailyHoursCompliance: 85,
        breakCompliance: 94,
        overtimeHours: 23.5,
        totalViolations: 8,
        criticalViolations: 1
      };

      setRules(mockRules);
      setViolations(mockViolations);
      setMetrics(mockMetrics);
    } catch (error) {
      toast({
        title: "Error loading compliance data",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCompliance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-scheduling-assistant', {
        body: { 
          action: 'check_compliance',
          data: { 
            companyId: 'current',
            schedules: [] // This would include current week schedules
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Compliance check complete",
        description: `Found ${data.violations?.length || 0} potential violations`,
      });
      
      await loadComplianceData();
    } catch (error) {
      toast({
        title: "Compliance check failed",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const resolveViolation = async (violationId: string) => {
    setViolations(prev => 
      prev.map(v => 
        v.id === violationId 
          ? { ...v, status: 'resolved' as const }
          : v
      )
    );
    
    toast({
      title: "Violation resolved",
      description: "Compliance violation has been marked as resolved",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance Monitor
          </h2>
          <p className="text-muted-foreground">
            Real-time labor law compliance tracking and violation alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={checkCompliance} className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Run Compliance Check
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Compliance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Overall Score</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.overallScore || 0}%</div>
            <Progress value={metrics?.overallScore || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Compliance rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Weekly Hours</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.weeklyHoursCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Within weekly limits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Break Compliance</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.breakCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Proper break coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Overtime Hours</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.overtimeHours || 0}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Violations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Active Violations ({violations.filter(v => v.status === 'active').length})
          </CardTitle>
          <CardDescription>
            Current compliance violations requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {violations.filter(v => v.status === 'active').length > 0 ? (
              violations.filter(v => v.status === 'active').map((violation) => (
                <Alert key={violation.id} className="relative">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(violation.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{violation.type}</span>
                        <Badge variant={getSeverityColor(violation.severity) as any} className="capitalize">
                          {violation.severity}
                        </Badge>
                        {violation.employee && (
                          <Badge variant="outline">{violation.employee.name}</Badge>
                        )}
                      </div>
                      <AlertDescription className="text-sm">
                        {violation.message}
                      </AlertDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Date: {violation.date}
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveViolation(violation.id)}
                          className="text-xs"
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2 text-green-700">No Active Violations</h3>
                <p className="text-muted-foreground">All scheduling is compliant with labor laws</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Active Compliance Rules
          </CardTitle>
          <CardDescription>
            Configure and manage labor law compliance rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm capitalize">
                      {rule.rule_type.replace('_', ' ')} 
                      {rule.role && ` (${rule.role})`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Limit: {rule.value} {rule.rule_type.includes('hours') ? 'hours' : 'minutes'}
                    </div>
                  </div>
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No compliance rules configured</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Add Rule
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}