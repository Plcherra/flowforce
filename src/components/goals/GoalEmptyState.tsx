import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GoalDialogs } from '@/hooks/useGoalDialogs';

interface GoalEmptyStateProps {
  dialogs: GoalDialogs;
}

export function GoalEmptyState({ dialogs }: GoalEmptyStateProps) {
  return (
    <Card className="border border-dashed border-border/70 bg-muted/20 py-12">
      <CardHeader className="space-y-2 text-center">
        <CardTitle>No goals yet</CardTitle>
        <CardDescription>
          Create your first goal to start tracking progress across the organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          onClick={() => {
            dialogs.open();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create goal
        </Button>
      </CardContent>
    </Card>
  );
}
