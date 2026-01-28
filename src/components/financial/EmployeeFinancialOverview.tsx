import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeeFinancialMetrics } from "@/hooks/useFinancialManagement";
import { format } from "date-fns";
import {
  Clock,
  DollarSign,
  PiggyBank,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

const loadingSkeleton = (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">
      {[...Array(3)].map((_, idx) => (
        <Skeleton key={idx} className="h-32 w-full rounded-xl" />
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
    <Skeleton className="h-40 w-full rounded-xl" />
  </div>
);

export function EmployeeFinancialOverview() {
  const metrics = useEmployeeFinancialMetrics();

  const hoursDelta = useMemo(
    () => metrics.hoursThisWeek - metrics.hoursLastWeek,
    [metrics.hoursThisWeek, metrics.hoursLastWeek],
  );

  const lastPaymentLabel = useMemo(() => {
    if (metrics.lastPaymentAmount === null || !metrics.lastPaymentDate) {
      return "No payments recorded yet";
    }
    return `$${metrics.lastPaymentAmount.toFixed(2)} on ${format(
      new Date(metrics.lastPaymentDate),
      "MMM d, yyyy",
    )}`;
  }, [metrics.lastPaymentAmount, metrics.lastPaymentDate]);

  if (metrics.loading) {
    return loadingSkeleton;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                Hours This Week
              </CardTitle>
              <CardDescription>
                Tracked via connected time entries
              </CardDescription>
            </div>
            {metrics.clockedInToday ? (
              <Badge variant="secondary" className="text-xs">
                Clocked in now
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {metrics.hoursThisWeek.toFixed(1)}h
              </span>
              <span
                className={`flex items-center text-sm ${
                  hoursDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {hoursDelta >= 0 ? (
                  <TrendingUp className="mr-1 h-4 w-4" />
                ) : (
                  <TrendingDown className="mr-1 h-4 w-4" />
                )}
                {hoursDelta >= 0 ? "+" : ""}
                {hoursDelta.toFixed(1)} vs last week
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              Avg shift {metrics.averageShiftLength.toFixed(1)}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <DollarSign className="h-4 w-4 text-primary" />
                Earnings (30 days)
              </CardTitle>
              <CardDescription>Approved and paid payouts</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              ${metrics.totalEarnings30d.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Last payment {lastPaymentLabel}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <PiggyBank className="h-4 w-4 text-primary" />
                Pending Reimbursements
              </CardTitle>
              <CardDescription>Awaiting manager approval</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              ${metrics.pendingEarnings.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Track expense receipts to accelerate approvals
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Weekly Hour Trend
            </CardTitle>
            <CardDescription>
              Automatic sync from the Toast labor feed
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.weeklyHourTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Earnings History
            </CardTitle>
            <CardDescription>
              Payouts from payroll and reimbursements
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.earningsTrend.slice(-30)}>
                <defs>
                  <linearGradient id="earningsArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#16a34a"
                  fill="url(#earningsArea)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            AI Financial Tips
          </CardTitle>
          <CardDescription>
            Personalized suggestions generated from your logged hours and
            payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.financialTips.map((tip, index) => (
            <div
              key={tip}
              className="flex items-start gap-3 rounded-lg border border-muted p-3"
            >
              <Badge variant="outline" className="mt-0.5 text-xs">
                Tip {index + 1}
              </Badge>
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
