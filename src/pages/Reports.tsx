import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  BookOpen, 
  Download,
  Calendar,
  Target,
  Trash2
} from 'lucide-react';
import { can, type UserIdentity } from '@/lib/auth/acl';

type CoverageRow = { date: string; locationId: string; area: 'FOH' | 'BOH'; target: number; assigned: number };
type WasteRow = { itemId: string; wasted: number; unit: string };
type TrainingRow = { name: string; pending: number; completed: number };

export default function ReportsPage() {
  const currentUser: UserIdentity = { id: 'u4', role: 'manager' };
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [waste, setWaste] = useState<WasteRow[]>([]);
  const [training, setTraining] = useState<TrainingRow[]>([]);

  useEffect(() => {
    if (!can(currentUser, 'reports.view')) return;
    
    // TODO: Connect to real reporting system
    // Currently showing empty data - integrate with actual business metrics
    setCoverage([]);
    setWaste([]);
    setTraining([]);
  }, [currentUser]);

  if (!can(currentUser, 'reports.view')) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const totalCoverageGap = coverage.reduce((acc, row) => acc + Math.max(0, row.target - row.assigned), 0);
  const totalWaste = waste.reduce((acc, item) => acc + item.wasted, 0);
  const totalPendingTraining = training.reduce((acc, module) => acc + module.pending, 0);
  const totalCompletedTraining = training.reduce((acc, module) => acc + module.completed, 0);

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Track performance, coverage, and key business metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Coverage Gap</p>
                <p className="text-2xl font-bold">{totalCoverageGap}</p>
                <p className="text-xs text-muted-foreground">positions short</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Waste</p>
                <p className="text-2xl font-bold">{totalWaste.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">kg this week</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Training</p>
                <p className="text-2xl font-bold">{totalPendingTraining}</p>
                <p className="text-xs text-muted-foreground">modules pending</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Training Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round((totalCompletedTraining / (totalCompletedTraining + totalPendingTraining)) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">completion rate</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="coverage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="coverage" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Coverage Analysis
          </TabsTrigger>
          <TabsTrigger value="waste" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Waste Report
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Training Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle>Staff Coverage vs Targets</CardTitle>
              <CardDescription>
                Compare actual staffing levels against target requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coverage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>No coverage data available. Connect your scheduling system to view staff coverage metrics.</p>
                  </div>
                ) : (
                  coverage.map((row, index) => (
                  <div key={index} className="grid grid-cols-5 items-center gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{row.date}</p>
                      <p className="text-sm text-muted-foreground">{row.locationId}</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={row.area === 'FOH' ? 'default' : 'secondary'}>
                        {row.area}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{row.target}</p>
                      <p className="text-xs text-muted-foreground">target</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-semibold ${
                        row.assigned < row.target ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {row.assigned}
                      </p>
                      <p className="text-xs text-muted-foreground">assigned</p>
                    </div>
                    <div className="text-right">
                      {row.assigned < row.target ? (
                        <Badge variant="destructive">
                          -{row.target - row.assigned} short
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500">
                          ✓ Covered
                        </Badge>
                      )}
                    </div>
                  </div>
                  )) || null
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste">
          <Card>
            <CardHeader>
              <CardTitle>Waste Analysis</CardTitle>
              <CardDescription>
                Food waste tracking for the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {waste.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trash2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>No waste data available. Connect your inventory system to view waste tracking metrics.</p>
                  </div>
                ) : (
                  waste.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-full">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.itemId}</p>
                        <p className="text-sm text-muted-foreground">Food item</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">
                        {item.wasted} {item.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">wasted</p>
                    </div>
                  </div>
                  ))
                )}
                {waste.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">Total Waste</p>
                      <p className="text-xl font-bold text-red-600">
                        {totalWaste.toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>Training Progress Overview</CardTitle>
              <CardDescription>
                Employee training completion status by module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {training.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>No training data available. Connect your training system to view progress metrics.</p>
                  </div>
                ) : (
                  training.map((module, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{module.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {module.completed + module.pending} total enrolled
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{module.completed}</p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${
                        module.pending > 0 ? 'bg-amber-500/10' : 'bg-gray-500/10'
                      }`}>
                        <p className={`text-2xl font-bold ${
                          module.pending > 0 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {module.pending}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>
                          {Math.round((module.completed / (module.completed + module.pending)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(module.completed / (module.completed + module.pending)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}