import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Target, TrendingUp, Users, Award } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreateGoalDialog } from '@/components/goals/CreateGoalDialog';
import { EditGoalDialog } from '@/components/goals/EditGoalDialog';
import { GoalDetailsDialog } from '@/components/goals/GoalDetailsDialog';
import { GoalCard } from '@/components/goals/GoalCard';
import LoadingSpinner from '@/components/resources/LoadingSpinner';
import type { Tables } from '@/integrations/supabase/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

type Goal = Tables<'goals'>;

export default function Goals() {
  const isMobile = useIsMobile();
  const { goals, loading, deleteGoal } = useGoals();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'draft'>('all');
  const [query, setQuery] = useState('');

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowEditDialog(true);
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await deleteGoal(goalId);
    }
  };

  const handleAddTask = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setShowDetailsDialog(true);
    }
  };

  const handleViewDetails = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailsDialog(true);
  };

  const normalized = goals.filter(g => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (g.title || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );
  });
  const activeGoals = normalized.filter(goal => goal.status === 'active');
  const completedGoals = normalized.filter(goal => goal.status === 'completed');
  const draftGoals = normalized.filter(goal => goal.status === 'draft');

  const stats = {
    total: goals.length,
    active: activeGoals.length,
    completed: completedGoals.length,
    averageProgress: goals.length > 0 ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      {/* Header */}
      <div className={`${isMobile ? 'flex flex-col space-y-3 px-4 py-3' : 'flex items-center justify-between'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>Goals & Objectives</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your team's progress and celebrate achievements
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          {isMobile ? 'New Goal' : 'Create Goal'}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className={`${isMobile ? 'px-4 grid grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-4 gap-6'}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProgress}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={`${isMobile ? 'px-4' : ''}`}>
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'} mb-4`}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className={`${isMobile ? '' : 'w-72'}`}>
            <Input
              placeholder="Search goals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Goals Content */}
      <div className={isMobile ? 'px-4' : ''}>
        {goals.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Goals Yet</CardTitle>
              <CardDescription>
                Create your first goal to start tracking progress and motivating your team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab}>
            <TabsContent value="all">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                {normalized.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="active">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                {activeGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="completed">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                {completedGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="draft">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                {draftGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete} onAddTask={handleAddTask} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <CreateGoalDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
      
      <EditGoalDialog
        goal={selectedGoal}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
      
      <GoalDetailsDialog
        goal={selectedGoal}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onEdit={handleEdit}
      />
    </div>
  );
}
