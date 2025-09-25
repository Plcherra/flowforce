import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/components/MessageCard';

export function MessageModal({ open, onOpenChange, message }: { open: boolean; onOpenChange: (v: boolean) => void; message: Message | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{message?.subject || 'Message'}</span>
            {message && (
              <div className="flex items-center gap-2">
                <Badge variant={message.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                  {message.status}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">{message.category}</Badge>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            View message details and respond if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">From: {message?.sender}</div>
          <div>{message?.content}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

