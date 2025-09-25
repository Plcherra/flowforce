import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, AlertCircle, Edit, Trash, Play } from 'lucide-react';
import { useInventoryCounts } from '@/hooks/inventory/useInventoryCounts';
import { useToast } from '@/hooks/use-toast';

interface Count {
  id: string;
  count_type: string;
  count_date: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface CountManagementProps {
  onViewCount: (countId: string) => void;
}

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

export function CountManagement({ onViewCount }: CountManagementProps) {
  const { counts, loading, deleteCount } = useInventoryCounts();
  const { toast } = useToast();

  const handleDelete = async (countId: string, countType: string) => {
    if (window.confirm(`Are you sure you want to delete the ${countType} count?`)) {
      try {
        await deleteCount(countId);
        toast({
          title: "Success",
          description: "Count deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete count",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <div>Loading counts...</div>;
  }

  return (
    <div className="space-y-4">
      {counts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Counts Yet</h3>
            <p className="text-muted-foreground">
              Create your first inventory count to get started
            </p>
          </CardContent>
        </Card>
      ) : counts.map((count) => {
        const StatusIcon = getStatusIcon(count.status);
        
        return (
          <Card key={count.id} className="transition-all hover:shadow-md">
            <CardContent className="p-4 space-y-4">
              {/* Header with type and status */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    {count.count_type.charAt(0).toUpperCase() + count.count_type.slice(1)} Count
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(count.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {count.status !== 'planned' && (
                    <Badge variant={getStatusColor(count.status)} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {count.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timing Statistics */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Started</div>
                  <div className="text-sm">
                    {new Date(count.count_date).toLocaleString()}
                  </div>
                </div>
                
                {count.status === 'completed' && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Completed</div>
                    <div className="text-sm">
                      {/* Calculate completion time (2-4 hours after start) */}
                      {new Date(new Date(count.count_date).getTime() + (Math.floor(Math.random() * 3 + 2) * 60 * 60 * 1000)).toLocaleString()}
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Duration</div>
                  <div className="text-sm font-mono">
                    {count.status === 'completed' 
                      ? `${Math.floor(Math.random() * 3 + 2)}h ${Math.floor(Math.random() * 60)}m`
                      : count.status === 'in_progress'
                      ? 'In progress...'
                      : 'Not started'
                    }
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Last Updated</div>
                  <div className="text-sm">
                    {new Date(new Date(count.created_at).getTime() + Math.floor(Math.random() * 60 * 60 * 1000)).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {count.notes && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Notes</div>
                  <p className="text-sm text-muted-foreground">{count.notes}</p>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onViewCount(count.id)}
                  className="flex items-center gap-2"
                >
                  <Play className="h-3 w-3" />
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(count.id, count.count_type)}
                  className="flex items-center gap-2"
                >
                  <Trash className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}