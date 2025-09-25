import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCookbook, type UOM } from '@/hooks/useCookbook';

interface DailyCountDialogProps {
  items: Array<{ id: string; name: string; uom: UOM }>;
}

export function DailyCountDialog({ items }: DailyCountDialogProps) {
  const { createCount } = useCookbook();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const rows = Object.entries(values)
        .filter(([, v]) => !Number.isNaN(v))
        .map(([item_id, on_hand]) => ({ 
          item_id, 
          on_hand: Number(on_hand), 
          uom: (items.find(i => i.id === item_id)?.uom || 'each') as UOM 
        }));
      if (rows.length > 0) await createCount(rows);
      setOpen(false);
      setValues({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Daily Count</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Daily Inventory Count</DialogTitle>
          <DialogDescription>Enter current on-hand quantities</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="flex-1">{item.name}</div>
              <div className="w-20">
                <Input
                  type="number"
                  placeholder="0"
                  value={values[item.id] || ''}
                  onChange={e => setValues(v => ({ ...v, [item.id]: Number(e.target.value) }))}
                />
              </div>
              <div className="w-16 text-sm text-muted-foreground">{item.uom}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Count'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}