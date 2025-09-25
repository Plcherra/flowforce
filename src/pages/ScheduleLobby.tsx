import { useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSchedules } from '@/hooks/scheduling/useSchedules';

export default function ScheduleLobby() {
  const { schedules, loading } = useSchedules();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const map: Record<string, { name: string; count: number; users: Set<string> }> = {};
    schedules.forEach((s: any) => {
      const key = s.location || 'General';
      if (!map[key]) map[key] = { name: key, count: 0, users: new Set() };
      map[key].count += 1;
      (s.assignments || []).forEach((a: any) => a.user_id && map[key].users.add(a.user_id));
    });
    const arr = Object.values(map);
    return arr.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));
  }, [schedules, query]);

  return (
    <div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Job Scheduling Lobby</h1>
          <Input placeholder="Search schedules" className="w-64" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <Card key={g.name} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    {g.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{g.count} shifts</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {g.users.size} users
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" asChild>
                    <Link to={`/scheduling?location=${encodeURIComponent(g.name)}`}>Access schedule</Link>
                  </Button>
                  <Button variant="ghost">⋯</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

