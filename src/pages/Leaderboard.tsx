import { useMemo } from 'react';
import { Trophy, Users, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployees } from '@/hooks/useEmployees';
import { useIsMobile } from '@/hooks/use-mobile';
import { getRoleLabel } from '@/data/navigationData';

export default function Leaderboard() {
  const isMobile = useIsMobile();
  const { employees, loading, error, refetchEmployees } = useEmployees();

  const groupedByRole = useMemo(() => {
    const roleMap = new Map<string, typeof employees>();
    employees.forEach((employee) => {
      const list = roleMap.get(employee.role) ?? [];
      list.push(employee);
      roleMap.set(employee.role, list);
    });

    return Array.from(roleMap.entries())
      .map(([role, list]) => ({
        role,
        employees: [...list].sort((a, b) => (b.skillXp ?? 0) - (a.skillXp ?? 0)),
        averageLevel:
          list.length > 0
            ? list.reduce((sum, item) => sum + (item.skillLevel ?? 1), 0) / list.length
            : 0,
      }))
      .sort((a, b) => a.role.localeCompare(b.role));
  }, [employees]);

  return (
    <div className={isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}>
      <header className={isMobile ? 'space-y-3' : 'flex items-center justify-between'}>
        <div>
          <h1 className={isMobile ? 'text-2xl font-bold' : 'text-3xl font-bold'}>
            Gamification Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track top performers by role based on XP and badges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {employees.length} active participants
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={refetchEmployees}
            aria-label="Refresh leaderboard"
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && employees.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : groupedByRole.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              No gamification data yet
            </CardTitle>
            <CardDescription>
              XP and badge data will appear here once employees start earning progress.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {groupedByRole.map((group) => {
            const topPerformer = group.employees[0];

            return (
              <Card key={group.role} className="border-primary/10 shadow-sm">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>{getRoleLabel(group.role)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.employees.length} participants
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Avg. level {group.averageLevel.toFixed(1)} · {group.employees.length}{' '}
                      total
                    </CardDescription>
                  </div>
                  {topPerformer && (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <Trophy className="h-4 w-4" />
                      <span>
                        {topPerformer.first_name} {topPerformer.last_name} leads at L
                        {topPerformer.skillLevel ?? 1}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-xs uppercase tracking-wide">Rank</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Employee</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Level</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">XP</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Badges</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Reliability</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.employees.map((employee, index) => (
                        <TableRow key={employee.id}>
                          <TableCell className="text-sm font-medium">
                            #{index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={employee.avatar_url ?? undefined} />
                                <AvatarFallback>
                                  {`${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}`.trim() ||
                                    employee.email?.[0] ||
                                    '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {employee.first_name} {employee.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {employee.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              L{employee.skillLevel ?? 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {employee.skillXp ?? 0}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline" className="text-xs">
                              {(employee.badges ?? []).length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {employee.reliability != null ? `${employee.reliability}%` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
