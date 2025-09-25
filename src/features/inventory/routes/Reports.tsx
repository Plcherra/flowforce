import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, TrendingDown, AlertTriangle, BarChart3, Download } from 'lucide-react';
import { useInventoryDashboard } from '@/hooks/inventory/useInventoryDashboard';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';

// Placeholder data for development - will be replaced with real data
const placeholderReports = {
  lowStock: [],
  waste: [],
  variance: [],
  prep: []
};

export default function InventoryReportsPage() {
  const { lowStock } = useInventoryDashboard();
  
  // Use real data when available, otherwise show empty state
  const lowStockReport = lowStock || [];
  const { waste, variance, prep } = placeholderReports;

  return (
    <InventoryLayout>
      <IfCan permission="reports.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Inventory Reports
              </h1>
              <p className="text-muted-foreground">
                Analytics and insights for inventory management
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button>Schedule Reports</Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Low Stock</span>
                </div>
                <div className="text-2xl font-bold text-destructive">
                  {lowStockReport.length}
                </div>
                <p className="text-xs text-muted-foreground">Items below minimum</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Waste Value</span>
                </div>
                <div className="text-2xl font-bold">
                  $0.00
                </div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Avg Variance</span>
                </div>
                <div className="text-2xl font-bold">
                  0.0%
                </div>
                <p className="text-xs text-muted-foreground">Count accuracy</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-4 w-4 bg-primary rounded-full" />
                  <span className="text-sm font-medium">Prep Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  0%
                </div>
                <p className="text-xs text-muted-foreground">Completion rate</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="low-stock" className="space-y-6">
            <TabsList>
              <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
              <TabsTrigger value="waste">Waste Analysis</TabsTrigger>
              <TabsTrigger value="variance">Count Variance</TabsTrigger>
              <TabsTrigger value="prep">Prep Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="low-stock">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Low Stock Report
                  </CardTitle>
                  <CardDescription>
                    Items currently below minimum stock levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStockReport.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No low stock items currently</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lowStockReport.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Current: {item.current} {item.unit || 'units'} | Min: {item.min}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              {(item.current - item.min)} below
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Order: {Math.abs(item.current - item.min)} {item.unit || 'units'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waste">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    Waste Analysis Report
                  </CardTitle>
                  <CardDescription>
                    Recent waste events and cost impact
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No waste data available yet</p>
                    <p className="text-sm text-muted-foreground mt-2">Waste tracking will appear here once configured</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Count Variance Report
                  </CardTitle>
                  <CardDescription>
                    Differences between expected and counted quantities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No count variance data available</p>
                    <p className="text-sm text-muted-foreground mt-2">Variance reports will appear after inventory counts</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prep">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-primary rounded-full" />
                    Prep Performance Report
                  </CardTitle>
                  <CardDescription>
                    Daily prep completion rates and efficiency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="h-12 w-12 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="h-5 w-5 bg-background rounded-full" />
                    </div>
                    <p className="text-muted-foreground">No prep performance data available</p>
                    <p className="text-sm text-muted-foreground mt-2">Prep tracking will appear here once configured</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}