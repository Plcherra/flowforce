import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type Message = {
  id: string;
  subject: string;
  content: string;
  sender: string;
  timestamp: string; // ISO string
  category: 'general' | 'helpdesk' | 'payroll' | 'hr' | 'urgent';
  status: 'open' | 'closed';
  unread?: boolean;
};

const categoryIcon: Record<Message['category'], string> = {
  general: '💬',
  helpdesk: '🛟',
  payroll: '💵',
  hr: '🧠',
  urgent: '⚠️',
};

export function MessageCard({ message, onClick }: { message: Message; onClick: (m: Message) => void }) {
  return (
    <Card
      onClick={() => onClick(message)}
      className={cn(
        'cursor-pointer transition hover:shadow-sm',
        message.unread ? 'border-primary/40 bg-primary/5' : 'border-border'
      )}
    >
      <CardContent className="p-4 flex gap-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted text-lg">
          <span>{categoryIcon[message.category]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium">{message.subject}</div>
            <div className="text-xs text-muted-foreground shrink-0">
              {new Date(message.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{message.content}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={message.status === 'open' ? 'default' : 'secondary'} className="text-xs">
              {message.status}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {message.category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

