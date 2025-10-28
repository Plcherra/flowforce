import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FilterKey = 'all' | 'unread' | 'teams' | 'helpdesk';

type Props = {
  active: FilterKey;
  onChange: (value: FilterKey) => void;
  labels?: Partial<Record<FilterKey, string>>;
  className?: string;
};

export function MessageFilterBar({ active, onChange, labels, className }: Props) {
  const items: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: labels?.all ?? 'All' },
    { key: 'unread', label: labels?.unread ?? 'Unread' },
    { key: 'teams', label: labels?.teams ?? 'Teams' },
    { key: 'helpdesk', label: labels?.helpdesk ?? 'Help Desk' },
  ];
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((i) => (
        <Button
          key={i.key}
          variant={active === i.key ? 'default' : 'outline'}
          size="sm"
          className="whitespace-nowrap px-3"
          onClick={() => onChange(i.key)}
        >
          {i.label}
        </Button>
      ))}
    </div>
  );
}
