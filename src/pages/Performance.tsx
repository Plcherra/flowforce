
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Target, BarChart3, Calendar, User } from 'lucide-react';

// TODO: Connect to real performance tracking system
const performanceData: any[] = [];

export default function Performance() {
  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Management</h1>
            <p className="text-gray-600 mt-1">
              Track performance metrics and manage goals
            </p>
          </div>
          <Button>
            <Target className="mr-2 h-4 w-4" />
            Set Goals
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Goals & Objectives</TabsTrigger>
            <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {performanceData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Connect to your performance tracking system to view employee metrics and goals.
                </p>
              </div>
            ) : (
              performanceData.map((data, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={data.employee.avatar || undefined} />
                      <AvatarFallback>
                        {data.employee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{data.employee.name}</CardTitle>
                      <CardDescription>{data.employee.role}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data.metrics).map(([key, value]) => (
                      <div key={key} className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{String(value)}%</div>
                        <div className="text-sm text-gray-600 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Goals</CardTitle>
                <CardDescription>Track progress on active objectives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No goals data available. Connect your performance system to view goals.</p>
                    </div>
                  ) : (
                    performanceData[0]?.goals?.map((goal: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{goal.title}</div>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${goal.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{goal.progress}%</span>
                        </div>
                      </div>
                      <Badge 
                        variant={goal.status === 'completed' ? 'default' : 'secondary'}
                        className="ml-4"
                      >
                        {goal.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    )) || null
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Reviews</CardTitle>
                <CardDescription>Scheduled and completed performance evaluations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Reviews</h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Structured performance reviews and feedback sessions will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
