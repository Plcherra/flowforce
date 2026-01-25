import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calculator, CheckCircle, Clock, AlertCircle, Save, FileCheck, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventoryCounts, useInventoryCountLines } from '@/features/inventory/hooks/useInventoryCounts';
import { MarketManCountingInterface } from '@/components/inventory/MarketManCountingInterface';
import { ItemSelector } from '@/components/inventory/ItemSelector';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';
import { listInventoryCountEvents } from '@/features/inventory/repositories/countsRepository';
import { logger } from '@/utils/logger';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'completed': return 'default';
    case 'awaiting_review': return 'secondary';
    case 'in_progress': return 'secondary';
    case 'planned': return 'outline';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return CheckCircle;
    case 'completed': return CheckCircle;
    case 'in_progress': return Clock;
    case 'awaiting_review': return Clock;
    case 'planned': return AlertCircle;
    default: return AlertCircle;
  }
};

const formatCountType = (type?: string | null) => {
  if (!type) return 'Inventory Count';
  return type
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const getPeriodLabel = (period?: string | null) => {
  switch (period) {
    case 'day_start':
      return 'Day Start';
    case 'day_end':
      return 'Day End';
    default:
      return 'Custom';
  }
};

const REVIEW_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending Review', variant: 'outline' },
  under_review: { label: 'Under Review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Needs Revision', variant: 'destructive' },
};

const EVENT_ICON_MAP: Record<string, LucideIcon> = {
  created: AlertCircle,
  started: Clock,
  item_counted: CheckCircle,
  note_added: AlertCircle,
  submitted: FileCheck,
  approved: CheckCircle,
  rejected: AlertCircle,
  reopened: AlertCircle,
};

interface CountDetailPageProps {
  countId?: string;
}

export default function CountDetailPage({ countId: propCountId }: CountDetailPageProps) {
  const { countId: paramCountId } = useParams<{ countId: string }>();
  const countId = propCountId || paramCountId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    counts,
    updateCount,
    completeCount,
    submitCountForReview,
    approveCount: approveInventoryCount,
    rejectCount: rejectInventoryCount,
    refetch: refetchCounts,
  } = useInventoryCounts();
  const {
    countLines,
    addItemToCount,
    addItemsToCount,
    updateCountLine,
    removeItemFromCount,
    refetch: refetchCountLines,
  } = useInventoryCountLines(countId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

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

  useEffect(() => {
    loadEvents();
  }, [countId]);

  const handleQuantityChange = (lineId: string, value: number) => {
    setQuantities(prev => ({ ...prev, [lineId]: value }));
  };

  const loadEvents = async () => {
    if (!countId) return;
    setLoadingEvents(true);
    try {
      const data = await listInventoryCountEvents(countId);
      setEvents(data);
    } catch (error) {
      logger.error('Error loading count events', { error, tags: ['error'] });
    } finally {
      setLoadingEvents(false);
    }
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
      await refetchCountLines();
      await refetchCounts();
      await loadEvents();
      
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
      await completeCount(countId!);
      await refetchCountLines();
      await refetchCounts();
      await loadEvents();
      
      toast({
        title: "Count Submitted",
        description: "Inventory count has been submitted for supervisor review",
      });
      
      // Navigate back to counts list
      navigate('/inventory/counts');
    } catch (error) {
      logger.error('Error completing count', { error, tags: ['error'] });
      toast({
        title: "Error", 
        description: "Failed to complete count",
        variant: "destructive",
      });
    }
  };

  const handleItemsSelected = async (items: Array<{ id: string; name: string; expectedQuantity: number }>) => {
    try {
      await addItemsToCount(items.map(item => ({ id: item.id, expectedQuantity: item.expectedQuantity })));
      await refetchCountLines();
      await loadEvents();
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
      await refetchCountLines();
      await loadEvents();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleApproveCount = async () => {
    if (!countId) return;
    try {
      const notes = window.prompt('Approval notes (optional):') || undefined;
      await approveInventoryCount(countId, notes);
      await refetchCounts();
      await loadEvents();
      toast({
        title: 'Count Approved',
        description: 'Inventory count has been approved and finalized.',
      });
    } catch (error) {
      logger.error('Error approving count', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: 'Failed to approve count',
        variant: 'destructive',
      });
    }
  };

  const handleRejectCount = async () => {
    if (!countId) return;
    const notes = window.prompt('Please provide revision notes for this count:');
    if (notes === null) {
      return;
    }

    try {
      await rejectInventoryCount(countId, notes || undefined);
      await refetchCounts();
      await loadEvents();
      toast({
        title: 'Revision Requested',
        description: 'The count has been sent back for additional work.',
      });
    } catch (error) {
      logger.error('Error rejecting count', { error, tags: ['error'] });
      toast({
        title: 'Error',
        description: 'Failed to send count back for revisions',
        variant: 'destructive',
      });
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
  const reviewBadge = REVIEW_STATUS_CONFIG[count.review_status] ?? REVIEW_STATUS_CONFIG.pending;

  return (
    <InventoryLayout>
      <IfCan permission="inventory.counts.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Button variant="outline" onClick={() => navigate('/inventory/counts')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                    <h1 className="text-2xl font-semibold">
                      {formatCountType(count.count_type)} • {getPeriodLabel(count.count_period)}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(count.count_date).toLocaleDateString()}</span>
                    <Badge variant={getStatusColor(count.status)} className="flex items-center gap-1 capitalize">
                      <StatusIcon className="h-3 w-3" />
                      {count.status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={reviewBadge.variant} className="capitalize">
                      {reviewBadge.label}
                    </Badge>
                    <span>{completion}% Complete</span>
                    {count.submitted_at && (
                      <span>Submitted {new Date(count.submitted_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <IfCan permission="inventory.counts.edit">
                  <Button
                    variant="outline"
                    onClick={handleSaveProgress}
                    disabled={count.status === 'awaiting_review' || count.status === 'approved'}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Progress
                  </Button>
                  <Button
                    onClick={handleCompleteCount}
                    disabled={
                      countLines.length === 0 ||
                      count.status === 'awaiting_review' ||
                      count.status === 'approved'
                    }
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                </IfCan>
                <IfCan permission="inventory.counts.approve">
                  {count.status === 'awaiting_review' && (
                    <>
                      <Button variant="outline" onClick={handleRejectCount}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                      <Button onClick={handleApproveCount}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </>
                  )}
                </IfCan>
              </div>
            </div>

            {count.locations && count.locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {count.locations.map((location) => (
                  <Badge key={location.id} variant="secondary">
                    {location.name}
                  </Badge>
                ))}
              </div>
            )}

            {count.description && (
              <p className="text-sm text-muted-foreground">{count.description}</p>
            )}
          </div>

          <Tabs defaultValue="counting" className="space-y-6">
            <TabsList>
              <TabsTrigger value="counting">Counting</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="counting">
              <div className="flex justify-end mb-4">
                <IfCan permission="inventory.counts.edit">
                  <Button size="sm" variant="outline" onClick={() => setShowItemSelector(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Items
                  </Button>
                </IfCan>
              </div>
              <MarketManCountingInterface 
                countId={countId!}
                lines={countLines}
                quantities={quantities}
                onQuantityChange={handleQuantityChange}
                onRemoveLine={
                  count.status === 'awaiting_review' || count.status === 'approved'
                    ? undefined
                    : (lineId) => handleRemoveItem(lineId)
                }
                readOnly={count.status === 'awaiting_review' || count.status === 'approved'}
              />
              <ItemSelector
                open={showItemSelector}
                onOpenChange={setShowItemSelector}
                onItemsSelected={handleItemsSelected}
                excludeIds={countLines.map(line => line.item_id)}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Count History</CardTitle>
                  <CardDescription>Activity log for this count</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingEvents ? (
                    <p className="text-sm text-muted-foreground">Loading activity…</p>
                  ) : events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => {
                        const Icon = EVENT_ICON_MAP[event.event_type] || AlertCircle;
                        const actorName = event.actor
                          ? `${event.actor.first_name ?? ''} ${event.actor.last_name ?? ''}`.trim() || 'System'
                          : 'System';

                        const payload = event.payload || {};

                        return (
                          <div key={event.id} className="flex items-start gap-3 rounded-lg border p-3">
                            <Icon className="mt-1 h-4 w-4 text-muted-foreground" />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm font-medium capitalize">
                                <span>{event.event_type.replace(/_/g, ' ')}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">By {actorName}</p>
                              {payload.notes && (
                                <p className="text-sm">{payload.notes}</p>
                              )}
                              {payload.item_id && (
                                <p className="text-xs text-muted-foreground">
                                  Item ID: {payload.item_id}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Count Type</span>
                      <p>{formatCountType(count.count_type)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Day Part</span>
                      <p>{getPeriodLabel(count.count_period)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Count Date</span>
                      <p>{new Date(count.count_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status</span>
                      <p className="capitalize">{count.status.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Review Status</span>
                      <p className="capitalize">{count.review_status.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created</span>
                      <p>{new Date(count.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Submitted</span>
                      <p>{count.submitted_at ? new Date(count.submitted_at).toLocaleString() : 'Not submitted'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Completed</span>
                      <p>{count.completed_at ? new Date(count.completed_at).toLocaleString() : 'Not completed'}</p>
                    </div>
                  </div>

                  {(count.description || count.notes) && (
                    <div className="mt-4 space-y-3">
                      {count.description && (
                        <div>
                          <span className="font-medium">Description</span>
                          <p className="text-sm text-muted-foreground">{count.description}</p>
                        </div>
                      )}
                      {count.notes && (
                        <div>
                          <span className="font-medium">Notes</span>
                          <p className="text-sm text-muted-foreground">{count.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
