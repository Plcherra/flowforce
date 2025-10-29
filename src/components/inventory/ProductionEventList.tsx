import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryProductionEvents } from '@/hooks/inventory/useInventoryProductionEvents';
import type { ProductionEvent, ProductionMaterialUsage } from '@/hooks/inventory/types';
import { AlertCircle } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const unitLabel = (unit?: { name?: string | null; abbreviation?: string | null } | null) => {
  if (!unit) return 'units';
  const { name, abbreviation } = unit;
  return abbreviation ? `${name ?? abbreviation} (${abbreviation})` : name ?? 'units';
};

const approvalBadgeVariant = (status: ProductionEvent['approval_status']) => {
  switch (status) {
    case 'approved':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
};

const SummarySkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 2 }).map((_, index) => (
      <Card key={index} className="border-dashed">
        <CardHeader className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export function ProductionEventList() {
  const { data: events = [], isLoading } = useInventoryProductionEvents();

  if (isLoading) {
    return <SummarySkeleton />;
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <AlertCircle className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">No production events recorded yet</p>
        <p className="text-xs text-muted-foreground">
          Record your first production run to see material usage, yield, and cost summaries here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const materials = (event.materials ?? []) as ProductionMaterialUsage[];
        const totalMaterialCost = event.material_cost ?? 0;
        const totalCost = event.total_output_cost ?? totalMaterialCost;
        const producedQuantity = event.produced_quantity ?? 0;

        return (
          <Card key={event.id}>
            <CardHeader className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {event.item?.name ?? 'Production Event'}
                  <Badge variant="outline">{event.production_type}</Badge>
                  <Badge variant={approvalBadgeVariant(event.approval_status)}>
                    {event.approval_status}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Recorded on {event.produced_at ? dateFormatter.format(new Date(event.produced_at)) : 'N/A'}
                </p>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs uppercase text-muted-foreground">Total Output Cost</span>
                <span className="text-lg font-semibold">
                  {currencyFormatter.format(totalCost)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Output</p>
                  <p className="text-sm font-semibold">
                    {producedQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    {unitLabel(event.produced_unit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Material Cost</p>
                  <p className="text-sm font-semibold">
                    {currencyFormatter.format(totalMaterialCost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Labor</p>
                  <p className="text-sm font-semibold">
                    {currencyFormatter.format(event.labor_cost ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Cost per Unit</p>
                  <p className="text-sm font-semibold">
                    {currencyFormatter.format(event.unit_output_cost ?? 0)}
                  </p>
                </div>
              </div>

              {materials.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead className="text-right">Quantity Used</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((material) => (
                        <TableRow key={`${event.id}-${material.ingredient_item_id}`}>
                          <TableCell>{material.ingredient?.name ?? 'Ingredient'}</TableCell>
                          <TableCell className="text-right">
                            {material.quantity_used?.toLocaleString(undefined, {
                              maximumFractionDigits: 3,
                            })}
                          </TableCell>
                          <TableCell>{unitLabel(material.unit)}</TableCell>
                          <TableCell className="text-right">
                            {currencyFormatter.format(material.total_cost ?? 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No material usage recorded for this production event.
                </p>
              )}

              {event.notes && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Notes</p>
                  <p className="text-muted-foreground">{event.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
