import { CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TimerStats, EditStats } from '@/features/inventory/hooks/useCountingTimer';

interface CountingStatsProps {
  itemsCompleted: number;
  itemsCounted: number;
  itemsRemaining: number;
  totalAmount: number;
  significantVariances: number;
  countingStats?: TimerStats;
  editStats?: EditStats;
  formatTime: (seconds: number) => string;
}

export function CountingStats({
  itemsCompleted,
  itemsCounted,
  itemsRemaining,
  totalAmount,
  significantVariances,
  countingStats,
  editStats,
  formatTime
}: CountingStatsProps) {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{itemsCompleted}</div>
            <div className="text-sm text-muted-foreground">Items Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{itemsCounted}</div>
            <div className="text-sm text-muted-foreground">Items Counted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{itemsRemaining}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{significantVariances}</div>
            <div className="text-sm text-muted-foreground">Significant Variances</div>
          </CardContent>
        </Card>
      </div>

      {/* Counting Completion Statistics */}
      {countingStats && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Counting Completed</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-700">Time Spent:</span>
                <p className="text-green-800 text-lg font-bold">{formatTime(countingStats.totalTimeSpent)}</p>
              </div>
              <div>
                <span className="font-medium text-green-700">Items Counted:</span>
                <p className="text-green-800 text-lg font-bold">{countingStats.itemsCounted}</p>
              </div>
              <div>
                <span className="font-medium text-green-700">Items per Minute:</span>
                <p className="text-green-800 text-lg font-bold">{countingStats.itemsPerMinute}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Statistics */}
      {editStats && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800">Edit Session Completed</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-yellow-700">Edit Time:</span>
                <p className="text-yellow-800 text-lg font-bold">{formatTime(editStats.editTimeSpent)}</p>
              </div>
              <div>
                <span className="font-medium text-yellow-700">Items Edited:</span>
                <p className="text-yellow-800 text-lg font-bold">{editStats.itemsEdited}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}