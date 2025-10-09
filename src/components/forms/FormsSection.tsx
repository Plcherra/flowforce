import { Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FormWithMeta } from '@/hooks/useForms';
import { formatDate, getOwnerName, getStatusColor, getTypeLabel } from '@/components/forms/form-utils';

interface FormsSectionProps {
  title: string;
  forms: FormWithMeta[];
  loading: boolean;
  emptyMessage?: string;
  onFill: (formId: string) => void;
  onEdit: (formId: string) => void;
}

export function FormsSection({
  title,
  forms,
  loading,
  emptyMessage = 'No forms to display.',
  onFill,
  onEdit,
}: FormsSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <Card className="border border-muted bg-background">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading forms…</div>
        ) : forms.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last edited</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[60px] text-center">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id} className="cursor-pointer" onClick={() => onFill(form.id)}>
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>{getTypeLabel(form)}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(form.status)} capitalize`}>{form.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(form.created_at)}</TableCell>
                  <TableCell>{formatDate(form.updated_at || form.created_at)}</TableCell>
                  <TableCell>{getOwnerName(form)}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit form"
                        onClick={() => onEdit(form.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}

export default FormsSection;
