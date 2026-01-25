import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { dispatchAutomationToFlowForce } from '@/server/automation/adapters/flowforceOperationsAdapter';
import type { AutomationScript } from '@/server/automation/validateScript';
import { logger } from '@/utils/logger';

interface AutomationSuggestion {
  id: string;
  suggestion_title: string;
  suggestion_summary?: string | null;
  status: string;
  script: AutomationScript;
}

const sectionTitleClass = 'text-xs uppercase tracking-[0.4em] text-muted-foreground';

export function AutomationsPanel() {
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('ops_automation_suggestions')
        .select('id,suggestion_title,suggestion_summary,status,script')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!active) return;
      if (error) {
        logger.error('[AutomationsPanel] failed to load suggestions', { error, tags: ['error'] });
        setSuggestions([]);
      } else {
        setSuggestions((data ?? []) as AutomationSuggestion[]);
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const activeAutomations = suggestions.filter((suggestion) => suggestion.status === 'active' || suggestion.status === 'applied');
  const proposedAutomations = suggestions.filter((suggestion) => suggestion.status !== 'active' && suggestion.status !== 'applied');

  async function handleDispatch(suggestion: AutomationSuggestion) {
    setDispatching(suggestion.id);
    try {
      await dispatchAutomationToFlowForce(suggestion.script);
    } catch (error) {
      logger.error('[AutomationsPanel] Failed to dispatch automation', { error, tags: ['error'] });
    } finally {
      setDispatching(null);
    }
  }

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className={sectionTitleClass}>Automations</p>
          <h3 className="text-lg font-semibold">Playbooks</h3>
        </div>
        <Badge variant="outline">FlowForce</Badge>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`automation-skeleton-${index}`} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <section>
            <p className={sectionTitleClass}>Active Automations</p>
            <ScrollArea className="mt-2 max-h-60 pr-2">
              <div className="space-y-3">
                {activeAutomations.length === 0 && <p className="text-sm text-muted-foreground">None running right now.</p>}
                {activeAutomations.map((automation) => (
                  <motion.div key={automation.id} layout className="rounded-2xl border bg-muted/30 p-3">
                    <p className="text-sm font-semibold">{automation.suggestion_title}</p>
                    {automation.suggestion_summary && <p className="text-xs text-muted-foreground">{automation.suggestion_summary}</p>}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </section>

          <section>
            <p className={sectionTitleClass}>Suggested Automations</p>
            <ScrollArea className="mt-2 max-h-60 pr-2">
              <div className="space-y-3">
                {proposedAutomations.length === 0 && <p className="text-sm text-muted-foreground">No pending drafts.</p>}
                {proposedAutomations.map((automation) => (
                  <motion.div key={automation.id} layout className="rounded-2xl border bg-background p-3">
                    <p className="text-sm font-semibold">{automation.suggestion_title}</p>
                    {automation.suggestion_summary && <p className="text-xs text-muted-foreground">{automation.suggestion_summary}</p>}
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      disabled={dispatching === automation.id}
                      onClick={() => void handleDispatch(automation)}
                    >
                      {dispatching === automation.id ? 'Dispatching…' : 'Send to FlowForce'}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </section>
        </div>
      )}
    </div>
  );
}
