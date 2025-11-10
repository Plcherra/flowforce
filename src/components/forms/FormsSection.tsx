import type { KeyboardEvent } from 'react';
import { Edit, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { FormWithMeta } from '@/hooks/useForms';
import { formatDate, getOwnerName, getStatusColor, getTypeLabel } from '@/components/forms/form-utils';

interface FormsSectionProps {
  title: string;
  forms: FormWithMeta[];
  loading: boolean;
  refreshing?: boolean;
  canEdit?: boolean;
  emptyMessage?: string;
  onFill: (formId: string) => void;
  onEdit: (formId: string) => void;
}

export function FormsSection({
  title,
  forms,
  loading,
  refreshing = false,
  canEdit = true,
  emptyMessage = 'No forms to display.',
  onFill,
  onEdit,
}: FormsSectionProps) {
  const skeletonRows = Array.from({ length: 3 });

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, formId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onFill(formId);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <Card className="border border-muted bg-background">
        {loading ? (
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last edited</TableHead>
                  <TableHead>Owner</TableHead>
                  {canEdit && <TableHead className="w-[60px] text-center">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {skeletonRows.map((_, index) => (
                  <TableRow key={`forms-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Skeleton className="mx-auto h-8 w-8 rounded-full" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : forms.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="relative">
            {refreshing && (
              <div className="absolute right-4 top-3 z-10 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing
              </div>
            )}
            <Table className={refreshing ? 'opacity-60 transition-opacity' : undefined}>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last edited</TableHead>
                  <TableHead>Owner</TableHead>
                  {canEdit && <TableHead className="w-[60px] text-center">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow
                    key={form.id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${form.title} to fill`}
                    onClick={() => onFill(form.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, form.id)}
                  >
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell>{getTypeLabel(form)}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(form.status)} capitalize`}>{form.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(form.created_at)}</TableCell>
                    <TableCell>{formatDate(form.updated_at || form.created_at)}</TableCell>
                    <TableCell>{getOwnerName(form)}</TableCell>
                    {canEdit && (
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit form"
                            disabled={!canEdit}
                            onClick={() => {
                              if (!canEdit) return;
                              onEdit(form.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default FormsSection;
