import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';

export interface OpsIssue {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  description?: string | null;
  status?: string | null;
  issue_type?: string | null;
}

const severityClasses: Record<OpsIssue['severity'], string> = {
  info: 'text-muted-foreground border-border',
  warning: 'text-amber-600 border-amber-200',
  critical: 'text-red-600 border-red-200',
};

interface AutomationSuggestionResponse {
  suggestionId: string;
  status: string;
  script: unknown;
}

export function IssuesStream() {
  const [issues, setIssues] = useState<OpsIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerIssue, setDrawerIssue] = useState<OpsIssue | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerResult, setDrawerResult] = useState<AutomationSuggestionResponse | null>(null);

  useEffect(() => {
    let active = true;
    async function loadIssues() {
      setLoading(true);
      const { data, error } = await supabase
        .from('ops_issues')
        .select('id,title,severity,description,status,issue_type')
        .order('created_at', { ascending: false })
        .limit(12);
      if (!active) return;
      if (error) {
        console.error('[IssuesStream] failed to load issues', error);
        setIssues([]);
      } else {
        setIssues(
          (data ?? []).map((issue) => ({
            id: issue.id,
            title: issue.title,
            severity: (issue.severity as OpsIssue['severity']) ?? 'warning',
            description: issue.description,
            status: issue.status,
            issue_type: issue.issue_type,
          })),
        );
      }
      setLoading(false);
    }

    void loadIssues();
    return () => {
      active = false;
    };
  }, []);

  const openAutomationDrawer = async (issue: OpsIssue) => {
    setDrawerIssue(issue);
    setDrawerLoading(true);
    setDrawerError(null);
    setDrawerResult(null);
    try {
      const response = await fetch(`/api/ops/issues/${issue.id}/suggest-automation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId: 'demo-org' }),
      });
      if (!response.ok) {
        throw new Error(`Failed to generate automation (${response.status})`);
      }
      const payload = (await response.json()) as AutomationSuggestionResponse;
      setDrawerResult(payload);
    } catch (error) {
      console.error('[IssuesStream] automation generation failed', error);
      setDrawerError(error instanceof Error ? error.message : 'Unable to generate suggestion');
    } finally {
      setDrawerLoading(false);
    }
  };

  const issueList = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`ops-issue-skeleton-${index}`} className="h-20 w-full rounded-3xl" />
          ))}
        </div>
      );
    }

    if (issues.length === 0) {
      return <p className="text-sm text-muted-foreground">No live issues. Enjoy the calm.</p>;
    }

    return (
      <ScrollArea className="h-[420px] pr-2">
        <div className="space-y-3">
          {issues.map((issue) => (
            <motion.div
              key={issue.id}
              layout
              className={`rounded-3xl border bg-background/95 p-4 shadow-sm ${severityClasses[issue.severity]}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{issue.title}</p>
                  {issue.issue_type && <p className="text-xs uppercase tracking-wide text-muted-foreground">{issue.issue_type}</p>}
                </div>
                <Badge variant="outline">{issue.status ?? 'open'}</Badge>
              </div>
              {issue.description && <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>}
              <Button className="mt-4" size="sm" variant="outline" onClick={() => void openAutomationDrawer(issue)}>
                Generate Automation
              </Button>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    );
  }, [issues, loading]);

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Issues</p>
          <h3 className="text-lg font-semibold">Operational Issues</h3>
        </div>
        <Badge variant="outline">Live</Badge>
      </div>
      <div className="mt-4">{issueList}</div>

      <Drawer
        open={Boolean(drawerIssue)}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerIssue(null);
            setDrawerResult(null);
            setDrawerError(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Automation suggestion</DrawerTitle>
            <DrawerDescription>
              FlowForce will design a sequence tailored to “{drawerIssue?.title ?? ''}”.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-4 text-sm">
            {drawerLoading && <p>Generating automation script…</p>}
            {drawerError && <p className="text-red-600">{drawerError}</p>}
            {drawerResult && (
              <pre className="max-h-64 overflow-auto rounded-xl bg-muted/60 p-3 text-xs">
                {JSON.stringify(drawerResult.script, null, 2)}
              </pre>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
