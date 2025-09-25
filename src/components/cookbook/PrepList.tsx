import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCookbook, PrepItem } from '@/hooks/useCookbook';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

export function PrepList() {
  const { prepItems, suggestToMake, createProduction } = useCookbook();
  const [savingId, setSavingId] = useState<string | null>(null);

  const prioritized = useMemo(() => {
    const rows = prepItems.map((p) => {
      const s = suggestToMake(p);
      const priority = p.par_min > 0 ? Math.max(0, p.par_min - s.onHand) : 0;
      return { item: p, ...s, priority };
    });
    return rows.sort((a, b) => b.priority - a.priority);
  }, [prepItems, suggestToMake]);

  const runMake = async (p: PrepItem, qty: number) => {
    setSavingId(p.id);
    try {
      await createProduction({ item_id: p.id, qty, uom: p.uom, note: 'Prep from PAR planner' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {prioritized.map(({ item, onHand, needed, priority }) => (
        <Card key={item.id} className={priority > 0 ? 'border-amber-400' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="truncate" title={item.name}>{item.name}</span>
              <Badge variant={priority > 0 ? 'destructive' : 'outline'}>{priority > 0 ? 'Low' : 'OK'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PAR</span>
              <span>{item.par_min} – {item.par_max} {item.uom}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">On hand</span>
              <span>{onHand} {item.uom}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Suggested</span>
              <span>{needed} {item.uom}</span>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <Button size="sm" variant="outline">View recipe</Button>
            <Button size="sm" onClick={() => runMake(item, Math.max(needed, 0))} disabled={savingId === item.id}>
              <Plus className="h-4 w-4 mr-1" />
              {savingId === item.id ? 'Creating…' : 'Log prep'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

