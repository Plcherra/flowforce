import { Button } from '@/components/ui/button';

type FilterKey = 'all' | 'unread' | 'teams' | 'helpdesk';

type Props = {
  active: FilterKey;
  onChange: (value: FilterKey) => void;
  labels?: Partial<Record<FilterKey, string>>;
};

export function MessageFilterBar({ active, onChange, labels }: Props) {
  const items: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: labels?.all ?? 'All' },
    { key: 'unread', label: labels?.unread ?? 'Unread' },
    { key: 'teams', label: labels?.teams ?? 'Teams' },
    { key: 'helpdesk', label: labels?.helpdesk ?? 'Help Desk' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Button
          key={i.key}
          variant={active === i.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(i.key)}
        >
          {i.label}
        </Button>
      ))}
    </div>
  );
}
