import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Layers, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const signalCards = [
  {
    id: 'counts',
    label: 'Counts due',
    value: '3 shifts',
    detail: 'North, Central, Catering',
    tone: 'text-foreground',
  },
  {
    id: 'low-stock',
    label: 'Low stock',
    value: '12 items',
    detail: 'Top priority: Yeast, Tri-tip, 2× garnish kits',
    tone: 'text-amber-600',
    icon: AlertTriangle,
  },
  {
    id: 'waste',
    label: 'Waste trend',
    value: '-6.2%',
    detail: 'vs last week',
    tone: 'text-emerald-600',
    icon: TrendingDown,
  },
];

const shortageList = [
  { name: 'Cold brew concentrate', level: '18%', location: 'Bar' },
  { name: 'Ciabatta loaves', level: '32%', location: 'Bake' },
  { name: 'Compostable bowls', level: '21%', location: 'Service' },
];

export function InventorySignalWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-3xl border bg-background/95 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Inventory</p>
          <h3 className="text-lg font-semibold">Signals</h3>
          <p className="text-sm text-muted-foreground">Track shortages without leaving the thread.</p>
        </div>
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-4 space-y-3">
        {signalCards.map((card) => (
          <div key={card.id} className="rounded-2xl border border-border/70 bg-background/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
              {card.icon && <card.icon className={`h-4 w-4 ${card.tone}`} />}
            </div>
            <p className={`text-xl font-semibold ${card.tone}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {shortageList.map((item) => (
          <div key={item.name} className="rounded-2xl border border-dashed border-border/70 p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{item.name}</span>
              <span className="text-muted-foreground">{item.level}</span>
            </div>
            <p className="text-xs text-muted-foreground">Location: {item.location}</p>
            <Progress value={parseInt(item.level, 10)} className="mt-2 h-2 rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <Button asChild className="mt-4 w-full gap-2" variant="outline">
        <Link to="/app/inventory">
          Open inventory
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}
