import { useMemo, useState } from 'react';
import { sections as fileSections } from '@/sections/registry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Edit2, Copy, Trash2, FolderOpen } from 'lucide-react';

type Props = {
  onCreate?: () => void;
};

const catColor: Record<string, string> = {
  communication: 'bg-purple-100 text-purple-800',
  operations: 'bg-green-100 text-green-800',
  hr: 'bg-blue-100 text-blue-800',
  custom: 'bg-gray-100 text-gray-800',
};

export function FileSectionsManager({ onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'communication' | 'operations' | 'hr' | 'custom'>('all');
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(fileSections.map(s => [s.slug, true])));

  const filtered = useMemo(() => {
    return fileSections.filter(s =>
      (category === 'all' || s.category === category) &&
      (s.title.toLowerCase().includes(query.toLowerCase()) || s.slug.includes(query))
    );
  }, [query, category]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>File-based Sections</span>
          <div className="flex gap-2">
            <Input className="w-56" placeholder="Search sections..." value={query} onChange={e => setQuery(e.target.value)} />
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="hr">HR & People</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {onCreate && <Button onClick={onCreate}>Create Section</Button>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map((s) => (
          <div key={s.slug} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Badge className={catColor[s.category] || catColor.custom}>{s.category}</Badge>
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">/sections/{s.slug} • Pages: {s.pages.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={visible[s.slug]} onCheckedChange={(v) => setVisible(prev => ({ ...prev, [s.slug]: !!v }))} />
              <Button variant="outline" size="sm" onClick={() => window.open(`/sections/${s.slug}`, '_self')}>
                <FolderOpen className="h-4 w-4 mr-1" /> View
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`npm run gen:section ${s.slug}`)}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">No sections found</div>
        )}
      </CardContent>
    </Card>
  );
}

