/**
 * Task empty state component
 */

import { MessageSquare, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TaskEmptyStateProps {
  hasTasks: boolean;
  onCreateTask: () => void;
  onResetFilters?: () => void;
}

export function TaskEmptyState({
  hasTasks,
  onCreateTask,
  onResetFilters,
}: TaskEmptyStateProps) {
  if (hasTasks) {
    return (
      <Card data-testid="tasks-no-results">
        <CardContent className="flex flex-col items-center justify-center space-y-3 rounded-lg bg-slate-50 py-12 text-center dark:bg-slate-900/30">
          <Search className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No tasks match your filters</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try adjusting the status, priority, or search term to see more
            tasks.
          </p>
          {onResetFilters && (
            <Button variant="ghost" size="sm" onClick={onResetFilters}>
              Reset filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="tasks-empty-state">
      <CardContent className="flex flex-col items-center justify-center rounded-lg bg-slate-50 py-12 text-center dark:bg-slate-900/30">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
        <p className="text-muted-foreground text-center mb-4">
          Create your first task to get started with project management.
        </p>
        <Button onClick={onCreateTask}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </CardContent>
    </Card>
  );
}
