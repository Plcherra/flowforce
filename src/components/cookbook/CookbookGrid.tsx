import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCookbook } from '@/hooks/useCookbook';

export function CookbookGrid() {
  const { menuItems, loading } = useCookbook();
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {menuItems.map((m) => (
        <Card key={m.id}>
          <CardHeader>
            <CardTitle className="text-base">{m.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{m.pos_code ? `POS ${m.pos_code}` : 'Menu item'}</div>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">Open</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

