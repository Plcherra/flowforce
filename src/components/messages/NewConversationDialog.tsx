import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

export type ConversationType = 'direct' | 'team';

export interface ConversationDraft {
  type: ConversationType;
  name: string;
  participantIds: string[];
  initialMessage: string;
}

export interface ChatUserSummary {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  users: ChatUserSummary[];
  currentUserId: string;
  onCreate: (draft: ConversationDraft) => void;
}

export function NewConversationDialog({ open, onOpenChange, users, currentUserId, onCreate }: NewConversationDialogProps) {
  const [type, setType] = useState<ConversationType>('direct');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  const selectableUsers = users.filter((user) => user.id !== currentUserId);
  const hasSelectableUsers = selectableUsers.length > 0;

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const canSubmit =
    initialMessage.trim().length > 0 &&
    (type === 'direct'
      ? participantIds.length === 1
      : teamName.trim().length > 0 && participantIds.length > 1);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const draft: ConversationDraft = {
      type,
      name: type === 'direct' ? '' : teamName.trim(),
      participantIds,
      initialMessage: initialMessage.trim(),
    };

    onCreate(draft);
    setParticipantIds([]);
    setTeamName('');
    setInitialMessage('');
    setType('direct');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>Choose who you want to talk with and send the first message.</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="conversation-type">Conversation type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ConversationType)}>
              <SelectTrigger id="conversation-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct message</SelectItem>
                <SelectItem value="team">Team / group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                placeholder="Kitchen Supervisors"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                required={type === 'team'}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Participants</Label>
            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="space-y-2">
                {hasSelectableUsers ? (
                  selectableUsers.map((user) => {
                    const checked = participantIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-2 text-sm transition',
                          checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleParticipant(user.id)} />
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          {user.role && <span className="text-xs text-muted-foreground">{user.role}</span>}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <div>
                      <p>No teammates are available yet.</p>
                      <p className="text-xs">New chats unlock automatically as colleagues join the workspace.</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {hasSelectableUsers
                ? type === 'direct'
                  ? 'Select exactly one teammate to start a private chat.'
                  : 'Select at least two teammates to start a group conversation.'
                : 'Ask an administrator to register teammates so you can start chatting.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial-message">First message</Label>
            <Textarea
              id="initial-message"
              placeholder="Write the first message..."
              value={initialMessage}
              onChange={(event) => setInitialMessage(event.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Start conversation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default NewConversationDialog;
