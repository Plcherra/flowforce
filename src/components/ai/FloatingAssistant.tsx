import React, { useState } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AIAssistant from './AIAssistant';
import type { AssistantAction, AssistantContext } from '@/types/ai';

interface FloatingAssistantProps {
  context?: AssistantContext | null;
  onTriggerAction?: (action: AssistantAction) => void;
}

export function FloatingAssistant({ context, onTriggerAction }: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAssistant = () => setIsOpen((prev) => !prev);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="rounded-xl border border-border bg-background shadow-2xl">
          <AIAssistant
            variant="floating"
            context={context}
            onClose={() => setIsOpen(false)}
            onTriggerAction={onTriggerAction}
          />
        </div>
      )}

      <Button
        size="lg"
        className="flex items-center gap-2 rounded-full px-4 py-2 shadow-lg"
        onClick={toggleAssistant}
      >
        <Bot className="h-4 w-4" />
        {isOpen ? 'Hide Co-Pilot' : 'Co-Pilot Live'}
        <Sparkles className="h-3 w-3 text-yellow-500" />
      </Button>
    </div>
  );
}
