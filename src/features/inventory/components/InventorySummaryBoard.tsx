import React from 'react';
import { motion } from 'framer-motion';
import { Activity, CalendarDays, Target, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const summaryMetrics = [
  { label: 'Stock accuracy', value: '97.4%', trend: '+0.8%', icon: Target },
  { label: 'Prep readiness', value: '82%', trend: 'Next prep in 3h', icon: CalendarDays },
  { label: 'Waste recovered', value: '$1.2k', trend: 'last 7 days', icon: Activity },
];

const prepTimeline = [
  { label: 'AM count window', detail: '06:00 - 08:00', status: 'In progress' },
  { label: 'Prep refresh', detail: '11:30 • Main kitchen', status: 'Queued' },
  { label: 'PAR adjustments', detail: '15:00 • All locations', status: 'Scheduled' },
];

const actionItems = [
  { name: 'Tri-tip', status: 'Below PAR', progress: 32 },
  { name: 'Caesar dressing', status: 'Count overdue', progress: 58 },
  { name: 'Compostable lids', status: 'Vendor pending', progress: 45 },
];

export function InventorySummaryBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08 }}
      className="rounded-3xl border bg-background/95 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Live picture</p>
          <h3 className="text-lg font-semibold">Detail board</h3>
          <p className="text-sm text-muted-foreground">Quick snapshot of inventory health.</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      </div>

      <div className="mt-4 grid gap-3">
        {summaryMetrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-border/70 bg-background/80 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <metric.icon className="h-4 w-4" />
              {metric.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-xl font-semibold">{metric.value}</p>
              <span className="text-xs text-muted-foreground">{metric.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prep timeline</p>
        <div className="mt-3 space-y-3">
          {prepTimeline.map((item) => (
            <div key={item.label} className="rounded-xl border border-dashed border-border/70 p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{item.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {actionItems.map((item) => (
          <div key={item.name} className="rounded-2xl border border-border/60 p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{item.name}</span>
              <span className="text-muted-foreground">{item.status}</span>
            </div>
            <Progress value={item.progress} className="mt-2 h-2 rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Next refresh in 14m</span>
        <span className="flex items-center gap-1">
          View reports
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.div>
  );
}
