import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MessageCard, type Message } from '@/components/MessageCard';
import { MessageFilterBar } from '@/components/MessageFilterBar';
import { MessageModal } from '@/components/MessageModal';
import { AvailabilityToggle } from '@/components/AvailabilityToggle';
import { Users } from 'lucide-react';

// TODO: Replace with real messaging system
const MESSAGES: Message[] = [];

export default function MessagesPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'teams' | 'helpdesk'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    // TODO: Connect to real messaging system
    let arr = MESSAGES.slice();
    if (filter === 'unread') arr = arr.filter((m) => m.unread);
    if (filter === 'helpdesk') arr = arr.filter((m) => m.category === 'helpdesk');
    if (filter === 'teams') arr = arr.filter((m) => m.category !== 'helpdesk');
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((m) => m.subject.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
    }
    arr.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    return arr;
  }, [filter, query]);

  return (
    <div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Messages</h1>
          <div className="flex items-center gap-2">
            <MessageFilterBar active={filter} onChange={setFilter} />
            <Input className="w-56" placeholder="Search messages..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Messages</h3>
              <p className="text-sm">Connect your messaging system to view and manage communications.</p>
            </div>
          ) : (
            list.map((m) => (
              <MessageCard key={m.id} message={m} onClick={(msg) => { setSelected(msg); setOpen(true); }} />
            ))
          )}
        </div>
      </div>

      <MessageModal open={open} onOpenChange={setOpen} message={selected} />
      <AvailabilityToggle />
    </div>
  );
}

