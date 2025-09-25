import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
  title?: string;
  columns?: string[];
  rows?: Array<Record<string, any>>;
  description?: string;
};

export function TablePage({ title = 'Table', columns = ['Name', 'Status', 'Updated'], rows = [], description }: Props) {
  const demo = rows.length === 0;
  const data = demo
    ? [
        { Name: 'Example A', Status: 'Active', Updated: 'Today' },
        { Name: 'Example B', Status: 'Inactive', Updated: 'Yesterday' },
      ]
    : rows;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {description && <p className="text-sm text-muted-foreground mb-3">{description}</p>}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((c) => (
                    <TableCell key={c}>{row[c] ?? '-'}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

