import { Button } from '@/components/ui/button';

type Props = {
  active: 'all' | 'unread' | 'teams' | 'helpdesk';
  onChange: (v: Props['active']) => void;
};

export function MessageFilterBar({ active, onChange }: Props) {
  const items: Array<{ key: Props['active']; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'teams', label: 'Teams' },
    { key: 'helpdesk', label: 'Help Desk' },
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

