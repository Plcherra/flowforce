import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPerformanceDataset } from '@/services/performance/performanceService';
import type { PerformanceDataset } from '@/services/performance/performanceTypes';

export interface PerformanceEmployeeSummary {
  id: string;
  fullName: string;
  role: string | null;
  avatarUrl: string | null;
  activeGoals: number;
  completedGoals: number;
  averageGoalProgress: number | null;
  reviewCount: number;
  averageReviewScore: number | null;
  lastReviewDate: string | null;
}

export interface PerformanceGoalSummary {
  id: string;
  title: string;
  status: string;
  progress: number;
  targetCompletionDate: string | null;
  createdAt: string;
  participantIds: string[];
}

export interface PerformanceReviewEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  severity: number;
  notes: string | null;
  createdAt: string;
}

export function usePerformanceOverview() {
  const query = useQuery<PerformanceDataset, Error>({
    queryKey: ['performance-dataset'],
    queryFn: fetchPerformanceDataset,
    staleTime: 1000 * 60 * 5,
  });

  const employees = useMemo<PerformanceEmployeeSummary[]>(() => {
    if (!query.data) return [];
    return query.data.employees
      .map((employee) => {
        const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
        const activeGoals = employee.goals.filter((goal) => goal.status !== 'completed').length;
        const completedGoals = employee.goals.filter((goal) => goal.status === 'completed').length;
        const averageGoalProgress =
          employee.goals.length > 0
            ? Math.round(
                employee.goals.reduce((sum, goal) => sum + goal.progress, 0) / employee.goals.length,
              )
            : null;
        const reviewCount = employee.reviews.length;
        const averageReviewScore =
          reviewCount > 0
            ? Math.round(
                (employee.reviews.reduce((sum, review) => sum + review.severity, 0) / reviewCount) * 10,
              ) / 10
            : null;

        return {
          id: employee.id,
          fullName: fullName || 'Unnamed Employee',
          role: employee.role ?? null,
          avatarUrl: employee.avatarUrl ?? null,
          activeGoals,
          completedGoals,
          averageGoalProgress,
          reviewCount,
          averageReviewScore,
          lastReviewDate: employee.latestReviewDate,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [query.data]);

  const goals = useMemo<PerformanceGoalSummary[]>(() => {
    if (!query.data) return [];
    const goalMap = new Map<
      string,
      PerformanceGoalSummary & {
        participantSet: Set<string>;
      }
    >();

    query.data.employees.forEach((employee) => {
      employee.goals.forEach((goal) => {
        const entry = goalMap.get(goal.id);
        if (entry) {
          entry.participantSet.add(employee.id);
          entry.progress = goal.progress; // Use most recent progress
        } else {
          goalMap.set(goal.id, {
            id: goal.id,
            title: goal.title ?? 'Untitled Goal',
            status: goal.status,
            progress: goal.progress,
            targetCompletionDate: goal.targetCompletionDate ?? null,
            createdAt: goal.createdAt ?? new Date().toISOString(),
            participantIds: [],
            participantSet: new Set([employee.id]),
          });
        }
      });
    });

    return Array.from(goalMap.values()).map((entry) => ({
      id: entry.id,
      title: entry.title,
      status: entry.status,
      progress: entry.progress,
      targetCompletionDate: entry.targetCompletionDate,
      createdAt: entry.createdAt,
      participantIds: Array.from(entry.participantSet),
    }));
  }, [query.data]);

  const reviews = useMemo<PerformanceReviewEntry[]>(() => {
    if (!query.data) return [];
    const reviewEntries: PerformanceReviewEntry[] = [];

    query.data.employees.forEach((employee) => {
      const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || 'Unknown Employee';
      employee.reviews.forEach((review) => {
        reviewEntries.push({
          id: review.id,
          employeeId: employee.id,
          employeeName: fullName,
          date: review.date,
          severity: review.severity,
          notes: review.notes,
          createdAt: review.date,
        });
      });
    });

    return reviewEntries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [query.data]);

  return {
    employees,
    goals,
    reviews,
    radar: query.data?.radar ?? [],
    dataset: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
