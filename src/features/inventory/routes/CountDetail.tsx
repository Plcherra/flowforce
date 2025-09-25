import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calculator, CheckCircle, Clock, AlertCircle, Save, FileCheck, Plus, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventoryCounts, useInventoryCountLines } from '@/hooks/inventory/useInventoryCounts';
import { MarketManCountingInterface } from '@/components/inventory/MarketManCountingInterface';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'secondary';
    case 'planned': return 'outline';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'in_progress': return Clock;
    case 'planned': return AlertCircle;
    default: return AlertCircle;
  }
};

interface CountDetailPageProps {
  countId?: string;
}

export default function CountDetailPage({ countId: propCountId }: CountDetailPageProps) {
  const { countId: paramCountId } = useParams<{ countId: string }>();
  const countId = propCountId || paramCountId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { counts, updateCount } = useInventoryCounts();
  const { countLines, addItemToCount, updateCountLine, removeItemFromCount } = useInventoryCountLines(countId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showItemSelector, setShowItemSelector] = useState(false);

  const count = counts.find(c => c.id === countId);

  useEffect(() => {
    // Initialize quantities from count lines
    const initialQuantities: Record<string, number> = {};
    countLines.forEach(line => {
      if (line.counted_quantity !== null) {
        initialQuantities[line.id] = line.counted_quantity;
      }
    });
    setQuantities(initialQuantities);
  }, [countLines]);

  const handleQuantityChange = (lineId: string, value: number) => {
    setQuantities(prev => ({ ...prev, [lineId]: value }));
  };

  const handleSaveProgress = async () => {
    try {
      // Update all count lines with current quantities
      const updates = Object.entries(quantities).map(([lineId, quantity]) => 
        updateCountLine(lineId, { counted_quantity: quantity })
      );
      
      await Promise.all(updates);
      
      // Update count status to in_progress if it was planned
      if (count?.status === 'planned') {
        await updateCount(countId!, { status: 'in_progress' });
      }
      
      toast({
        title: "Progress Saved",
        description: "Count progress has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const handleCompleteCount = async () => {
    try {
      // Update all count lines with quantities only (variance is auto-calculated)
      const updates = Object.entries(quantities).map(([lineId, quantity]) => {
        return updateCountLine(lineId, { 
          counted_quantity: quantity,
          counted_at: new Date().toISOString()
        });
      });
      
      await Promise.all(updates);
      
      // Mark count as completed
      await updateCount(countId!, { 
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      
      toast({
        title: "Count Completed",
        description: "Inventory count has been completed and variance calculated",
      });
      
      // Navigate back to counts list
      navigate('/inventory/counts');
    } catch (error) {
      console.error('Error completing count:', error);
      toast({
        title: "Error", 
        description: "Failed to complete count",
        variant: "destructive",
      });
    }
  };

  const handleItemsSelected = async (items: Array<{ id: string; name: string; expectedQuantity: number }>) => {
    try {
      const promises = items.map(item => 
        addItemToCount(item.id, item.expectedQuantity)
      );
      await Promise.all(promises);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveItem = async (lineId: string) => {
    try {
      await removeItemFromCount(lineId);
      // Remove from local state
      const newQuantities = { ...quantities };
      delete newQuantities[lineId];
      setQuantities(newQuantities);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (!count) {
    return (
      <InventoryLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Count not found</h1>
          <Button onClick={() => navigate('/inventory/counts')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Counts
          </Button>
        </div>
      </InventoryLayout>
    );
  }

  const StatusIcon = getStatusIcon(count.status);
  const totalLines = countLines.length;
  const completedLines = countLines.filter(line => 
    quantities[line.id] !== undefined || line.counted_quantity !== null
  ).length;
  const completion = totalLines > 0 ? Math.round((completedLines / totalLines) * 100) : 0;

  return (
    <InventoryLayout>
      <IfCan permission="inventory.counts.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/inventory/counts')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-muted-foreground">
                  {completion}% Complete
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveProgress}>
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </Button>
              <Button 
                onClick={handleCompleteCount}
                disabled={countLines.length === 0}
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Complete Count
              </Button>
            </div>
          </div>

          <Tabs defaultValue="counting" className="space-y-6">
            <TabsList>
              <TabsTrigger value="counting">Counting</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="counting">
              <MarketManCountingInterface 
                countId={countId!} 
                onCountUpdate={() => {
                  // Handle count update completion
                }}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Count History</CardTitle>
                  <CardDescription>Activity log for this count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Count Created</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(count.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {count.status !== 'planned' && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Count Started</p>
                          <p className="text-xs text-muted-foreground">
                            In progress
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Count Details</CardTitle>
                  <CardDescription>Information about this inventory count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Count Type:</span>
                      <p className="capitalize">{count.count_type}</p>
                    </div>
                    <div>
                      <span className="font-medium">Count Date:</span>
                      <p>{new Date(count.count_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <p className="capitalize">{count.status.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <p>{new Date(count.created_at).toLocaleDateString()}</p>
                    </div>
                    {count.notes && (
                      <div className="col-span-2">
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1">{count.notes}</p>
                      </div>
                    )}
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