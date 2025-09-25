
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAnalytics, useEmployeePerformance } from '@/hooks/useAnalytics';
import { 
  Users, 
  Clock, 
  CheckSquare, 
  AlertTriangle, 
  FileText, 
  TrendingUp,
  TrendingDown 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell 
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useAnalytics();
  const { data: performance } = useEmployeePerformance();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const performanceData = performance?.slice(0, 10).map(emp => ({
    name: `${emp.first_name} ${emp.last_name}`,
    completion_rate: emp.completion_rate,
    tasks: emp.tasks
  })) || [];

  const statusData = [
    { name: 'Active', value: analytics?.activeEmployees || 0 },
    { name: 'Pending Requests', value: analytics?.pendingTimeOffRequests || 0 },
    { name: 'Overdue Tasks', value: analytics?.overdueTasks || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{analytics?.totalEmployees || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{analytics?.activeEmployees || 0}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="text-xs">
                {analytics?.totalEmployees ? 
                  Math.round((analytics.activeEmployees / analytics.totalEmployees) * 100) : 0}% Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{analytics?.pendingTimeOffRequests || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center mt-2">
              <Badge variant={analytics?.pendingTimeOffRequests === 0 ? 'outline' : 'destructive'}>
                {analytics?.pendingTimeOffRequests === 0 ? 'All Clear' : 'Needs Review'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold">{analytics?.overdueTasks || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="flex items-center mt-2">
              {analytics?.overdueTasks === 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${analytics?.overdueTasks === 0 ? 'text-green-500' : 'text-red-500'}`}>
                {analytics?.overdueTasks === 0 ? 'Great work!' : 'Needs attention'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="employees" stroke="#3b82f6" name="Employees" />
                <Line type="monotone" dataKey="tasks" stroke="#10b981" name="Tasks" />
                <Line type="monotone" dataKey="timeOff" stroke="#f59e0b" name="Time Off" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completion_rate" fill="#3b82f6" name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                Total Forms
              </span>
              <Badge variant="outline">{analytics?.totalForms || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <CheckSquare className="h-4 w-4 mr-2 text-green-500" />
                Form Submissions
              </span>
              <Badge variant="outline">{analytics?.formSubmissions || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-orange-500" />
                Completed Tasks
              </span>
              <Badge variant="outline">{analytics?.completedTasks || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-purple-500" />
                Task Completion Rate
              </span>
              <Badge variant="outline">
                {analytics?.completedTasks && analytics?.overdueTasks ? 
                  Math.round((analytics.completedTasks / (analytics.completedTasks + analytics.overdueTasks)) * 100) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
