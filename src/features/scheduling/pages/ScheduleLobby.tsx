import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Users } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import {
  SchedulingProvider,
  useScheduling,
} from "@/contexts/SchedulingContext";

function ScheduleLobbyContent() {
  const { shifts, loading } = useScheduling();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; users: Set<string> }
    >();

    shifts.forEach((shift) => {
      const name = shift.location ?? "General";
      if (!map.has(name)) {
        map.set(name, { name, count: 0, users: new Set<string>() });
      }
      const entry = map.get(name)!;
      entry.count += 1;
      (shift.assignments ?? []).forEach((assignment) => {
        if (assignment.user_id) {
          entry.users.add(assignment.user_id);
        }
      });
    });

    return Array.from(map.values()).filter((group) =>
      group.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [shifts, query]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Scheduling Lobby</h1>
        <Input
          placeholder="Search schedules"
          className="w-64"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.name} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" />
                  {group.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{group.count} shifts</Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {group.users.size} users
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" asChild>
                  <Link
                    to={`/scheduling?location=${encodeURIComponent(group.name)}`}
                  >
                    Access schedule
                  </Link>
                </Button>
                <Button variant="ghost">⋯</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScheduleLobby() {
  return (
    <SchedulingProvider>
      <ScheduleLobbyContent />
    </SchedulingProvider>
  );
}
