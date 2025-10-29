import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ArrowRightLeft,
  CircleCheck,
  Clock,
  PlusCircle,
  Trash2,
  XCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useInventoryItems, useInventoryLocations } from '@/hooks/useInventory';
import {
  useCreateInventoryTransfer,
  useInventoryTransfers,
  useUpdateInventoryTransferStatus,
} from '@/hooks/inventory/useInventoryTransfers';
import { useEmployees } from '@/hooks/useEmployees';
import { useProfile } from '@/hooks/useProfile';
import type { InventoryItem, InventoryTransfer, InventoryTransferStatus } from '@/hooks/inventory/types';

interface LineItemRow {
  key: string;
  itemId: string;
  quantity: string;
  costPerUnit: string;
  unitId: string;
}

type StatusAction = 'sent' | 'received' | 'rejected';

type LineItemFieldErrors = {
  unit?: string;
};

type LineItemErrors = Record<string, LineItemFieldErrors>;

const statusLabels: Record<InventoryTransferStatus, string> = {
  requested: 'Requested',
  sent: 'In Transit',
  received: 'Received',
  rejected: 'Rejected',
};

const statusStyles: Record<InventoryTransferStatus, string> = {
  requested: 'bg-amber-100 text-amber-900 border-transparent',
  sent: 'bg-blue-100 text-blue-900 border-transparent',
  received: 'bg-emerald-100 text-emerald-900 border-transparent',
  rejected: 'bg-rose-100 text-rose-900 border-transparent',
};

const actionLabels: Record<string, string> = {
  created: 'Transfer created',
  updated: 'Details updated',
  status_changed: 'Status updated',
  deleted: 'Transfer deleted',
};

const actionStatusMap: Record<StatusAction, InventoryTransferStatus> = {
  sent: 'sent',
  received: 'received',
  rejected: 'rejected',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const makeLineItemRow = (): LineItemRow => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemId: '',
  quantity: '',
  costPerUnit: '',
  unitId: '',
});

const formatEmployeeName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(' ') || 'Unassigned';

const getItemUnitLabel = (item?: InventoryItem) =>
  item?.unit?.abbreviation || item?.unit?.name || 'units';

const formatTimestamp = (value?: string | null) =>
  value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—';

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format('MMM D, YYYY') : 'Not scheduled';

export function InventoryTransfersPanel() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const currentUserId = profile?.userId ?? profile?.id ?? '';

  const { data: items = [], isLoading: itemsLoading } = useInventoryItems();
  const { data: locations = [], isLoading: locationsLoading } = useInventoryLocations();
  const {
    employees: teamMembers = [],
    loading: employeesLoading,
  } = useEmployees();

  const {
    data: transfers = [],
    isLoading: transfersLoading,
  } = useInventoryTransfers();
  const createTransfer = useCreateInventoryTransfer();
  const updateTransferStatus = useUpdateInventoryTransferStatus();

  const [form, setForm] = useState({
    fromLocationId: '',
    toLocationId: '',
    fulfillerId: '',
    recipientId: currentUserId,
    deliveryDate: '',
    comments: '',
  });

  const [lineItems, setLineItems] = useState<LineItemRow[]>([makeLineItemRow()]);
  const [lineItemErrors, setLineItemErrors] = useState<LineItemErrors>({});

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    transfer: InventoryTransfer | null;
    action: StatusAction | null;
    requireNote: boolean;
  }>({
    open: false,
    transfer: null,
    action: null,
    requireNote: false,
  });

  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (currentUserId) {
      setForm((prev) =>
        prev.recipientId ? prev : { ...prev, recipientId: currentUserId },
      );
    }
  }, [currentUserId]);

  const estimatedTotal = useMemo(() => {
    return lineItems.reduce((sum, row) => {
      const item = items.find((entry) => entry.id === row.itemId);
      const quantity = Number.parseFloat(row.quantity);
      const costSource = row.costPerUnit || (item?.cost_per_unit ? String(item.cost_per_unit) : '');
      const cost = Number.parseFloat(costSource);
      if (!Number.isFinite(quantity) || quantity <= 0) return sum;
      if (!Number.isFinite(cost) || cost < 0) return sum;
      return sum + quantity * cost;
    }, 0);
  }, [items, lineItems]);

  const resetForm = () => {
    setForm({
      fromLocationId: '',
      toLocationId: '',
      fulfillerId: '',
      recipientId: currentUserId,
      deliveryDate: '',
      comments: '',
    });
    setLineItems([makeLineItemRow()]);
    setLineItemErrors({});
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    const units = item?.units ?? [];
    const primaryUnit = units.find((entry) => entry.unit_level === 1) ?? units[0];
    const fallbackUnitId = primaryUnit?.unit_id || item?.unit_id || '';
    const fallbackUnitCost =
      primaryUnit?.cost_per_unit ??
      item?.calculated_cost_per_unit ??
      item?.cost_per_unit ??
      undefined;
    const rowKey = lineItems[index]?.key;
    setLineItems((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              itemId,
              unitId: fallbackUnitId,
              costPerUnit:
                fallbackUnitCost != null
                  ? String(fallbackUnitCost)
                  : item?.cost_per_unit != null
                    ? String(item.cost_per_unit)
                    : '',
            }
          : row,
      ),
    );
    if (rowKey) {
      setLineItemErrors((prev) => {
        const next = { ...prev };
        if (fallbackUnitId) {
          if (!next[rowKey]?.unit) return prev;
          const nextRowErrors = { ...(next[rowKey] ?? {}) };
          delete nextRowErrors.unit;
          if (Object.keys(nextRowErrors).length === 0) {
            delete next[rowKey];
          } else {
            next[rowKey] = nextRowErrors;
          }
          return next;
        }

        return {
          ...next,
          [rowKey]: {
            ...(next[rowKey] ?? {}),
            unit: 'This item has no units configured. Update the item before creating a transfer.',
          },
        };
      });
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    setLineItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, quantity: value } : row)),
    );
  };

  const handleCostChange = (index: number, value: string) => {
    setLineItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, costPerUnit: value } : row)),
    );
  };

  const handleRemoveLineItem = (index: number) => {
    const rowKey = lineItems[index]?.key;
    setLineItems((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [makeLineItemRow()];
    });
    if (rowKey) {
      setLineItemErrors((prev) => {
        if (!prev[rowKey]) return prev;
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    }
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, makeLineItemRow()]);
  };

  const handleUnitChange = (index: number, rowKey: string, unitId: string) => {
    const itemId = lineItems[index]?.itemId;
    const item = items.find((entry) => entry.id === itemId);
    const matchedUnit = item?.units?.find((unit) => unit.unit_id === unitId);
    const fallbackCost =
      matchedUnit?.cost_per_unit ??
      item?.calculated_cost_per_unit ??
      item?.cost_per_unit ??
      null;

    setLineItems((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              unitId,
              costPerUnit: fallbackCost != null ? String(fallbackCost) : row.costPerUnit,
            }
          : row,
      ),
    );

    if (rowKey) {
      setLineItemErrors((prev) => {
        const current = prev[rowKey];
        if (!current?.unit) return prev;
        const next = { ...prev };
        const nextRowErrors = { ...current };
        delete nextRowErrors.unit;
        if (Object.keys(nextRowErrors).length === 0) {
          delete next[rowKey];
        } else {
          next[rowKey] = nextRowErrors;
        }
        return next;
      });
    }
  };

  const validateLineItems = () => {
    const nextErrors: LineItemErrors = {};

    lineItems.forEach((row) => {
      if (!row.itemId) return;
      const item = items.find((entry) => entry.id === row.itemId);
      const availableUnits = new Set<string>();
      (item?.units ?? []).forEach((unit) => {
        availableUnits.add(unit.unit_id);
      });
      if (item?.unit_id) {
        availableUnits.add(item.unit_id);
      }

      const unitId = row.unitId || item?.unit_id || '';

      if (!unitId) {
        nextErrors[row.key] = {
          unit:
            availableUnits.size === 0
              ? 'This item has no units configured. Update the item before creating a transfer.'
              : 'Select a unit for this item.',
        };
        return;
      }

      if (availableUnits.size > 0 && !availableUnits.has(unitId)) {
        nextErrors[row.key] = { unit: 'Select a valid unit option.' };
      }
    });

    setLineItemErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildLineItemPayload = () => {
    return lineItems
      .map((row) => {
        if (!row.itemId) return null;
        const item = items.find((entry) => entry.id === row.itemId);
        const quantity = Number.parseFloat(row.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return null;
        const costString = row.costPerUnit || (item?.cost_per_unit != null ? String(item.cost_per_unit) : '');
        const cost = Number.parseFloat(costString);
        const unitId = row.unitId || item?.unit_id;
        if (!unitId) return null;
        return {
          item_id: row.itemId,
          unit_id: unitId,
          quantity,
          cost_per_unit: Number.isFinite(cost) && cost >= 0 ? cost : undefined,
        };
      })
      .filter((entry): entry is {
        item_id: string;
        unit_id: string;
        quantity: number;
        cost_per_unit?: number;
      } => Boolean(entry));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.fromLocationId || !form.toLocationId || !form.fulfillerId || !form.recipientId) {
      toast({
        title: 'Missing details',
        description: 'Select locations and both fulfiller and recipient.',
        variant: 'destructive',
      });
      return;
    }

    if (form.fromLocationId === form.toLocationId) {
      toast({
        title: 'Invalid locations',
        description: 'From and To locations must be different.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateLineItems()) {
      toast({
        title: 'Select units',
        description: 'Choose a unit for each transfer item before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const payloadItems = buildLineItemPayload();
    if (payloadItems.length === 0) {
      toast({
        title: 'Add items',
        description: 'Include at least one valid item with quantity.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTransfer.mutateAsync({
        from_location_id: form.fromLocationId,
        to_location_id: form.toLocationId,
        fulfiller_id: form.fulfillerId,
        recipient_id: form.recipientId,
        delivery_date: form.deliveryDate || undefined,
        comments: form.comments.trim() || undefined,
        status_note: form.comments.trim() || undefined,
        items: payloadItems,
      });
      resetForm();
    } catch {
      // Errors surfaced through toast in mutation
    }
  };

  const openStatusDialog = (transfer: InventoryTransfer, action: StatusAction) => {
    setStatusDialog({
      open: true,
      transfer,
      action,
      requireNote: action === 'rejected',
    });
    setStatusNote('');
  };

  const closeStatusDialog = () => {
    setStatusDialog({
      open: false,
      transfer: null,
      action: null,
      requireNote: false,
    });
    setStatusNote('');
  };

  const handleStatusSubmit = async () => {
    if (!statusDialog.transfer || !statusDialog.action) return;
    const note = statusNote.trim();

    if (statusDialog.requireNote && !note) {
      toast({
        title: 'Add a note',
        description: 'Please include a note when rejecting a transfer.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateTransferStatus.mutateAsync({
        id: statusDialog.transfer.id,
        status: actionStatusMap[statusDialog.action],
        status_note: note || undefined,
      });
      closeStatusDialog();
    } catch {
      // handled in mutation toast
    }
  };

  const canMarkAsSent = (transfer: InventoryTransfer) =>
    transfer.status === 'requested' && transfer.fulfiller_id === currentUserId;

  const canMarkAsReceived = (transfer: InventoryTransfer) =>
    transfer.status === 'sent' && transfer.recipient_id === currentUserId;

  const canReject = (transfer: InventoryTransfer) => {
    if (transfer.status === 'requested') {
      return transfer.fulfiller_id === currentUserId || transfer.recipient_id === currentUserId;
    }
    if (transfer.status === 'sent') {
      return transfer.recipient_id === currentUserId;
    }
    return false;
  };

  const transfersList = useMemo(() => transfers ?? [], [transfers]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Create Transfer
          </CardTitle>
          <CardDescription>
            Coordinate stock movement between locations with cost tracking and approvals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-location">From location</Label>
                <Select
                  value={form.fromLocationId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, fromLocationId: value }))}
                  disabled={locationsLoading}
                  required
                >
                  <SelectTrigger id="from-location">
                    <SelectValue placeholder={locationsLoading ? 'Loading locations...' : 'Select location'} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="to-location">To location</Label>
                <Select
                  value={form.toLocationId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, toLocationId: value }))}
                  disabled={locationsLoading}
                  required
                >
                  <SelectTrigger id="to-location">
                    <SelectValue placeholder={locationsLoading ? 'Loading locations...' : 'Select location'} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fulfiller">Fulfiller</Label>
                <Select
                  value={form.fulfillerId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, fulfillerId: value }))}
                  disabled={employeesLoading}
                  required
                >
                  <SelectTrigger id="fulfiller">
                    <SelectValue placeholder={employeesLoading ? 'Loading team...' : 'Select fulfiller'} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {formatEmployeeName(member.first_name, member.last_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient</Label>
                <Select
                  value={form.recipientId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, recipientId: value }))}
                  disabled={employeesLoading}
                  required
                >
                  <SelectTrigger id="recipient">
                    <SelectValue placeholder={employeesLoading ? 'Loading team...' : 'Select recipient'} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {formatEmployeeName(member.first_name, member.last_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="delivery-date">Target delivery date</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={form.deliveryDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliveryDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  placeholder="Add context for the fulfiller..."
                  value={form.comments}
                  onChange={(event) => setForm((prev) => ({ ...prev, comments: event.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Transfer items</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((row, index) => {
                  const item = items.find((entry) => entry.id === row.itemId);
                  const unitOptions = item?.units ?? [];
                  const includeBaseUnitOption =
                    Boolean(item?.unit_id) && !unitOptions.some((unit) => unit.unit_id === item?.unit_id);
                  const resolvedUnit =
                    unitOptions.find((unit) => unit.unit_id === row.unitId)?.unit ||
                    (row.unitId && row.unitId === item?.unit_id ? item?.unit : undefined);
                  const unitLabel =
                    resolvedUnit?.abbreviation || resolvedUnit?.name || getItemUnitLabel(item);
                  const hasUnitChoices = unitOptions.length > 0 || Boolean(item?.unit_id);
                  const unitError = lineItemErrors[row.key]?.unit;

                  return (
                    <div
                      key={row.key}
                      className="grid gap-4 rounded-lg border p-4 md:grid-cols-12 md:items-end"
                    >
                      <div className="md:col-span-4 space-y-2">
                        <Label>Item</Label>
                        <Select
                          value={row.itemId}
                          onValueChange={(value) => handleItemSelect(index, value)}
                          disabled={itemsLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={itemsLoading ? 'Loading items...' : 'Select item'} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((entry) => (
                              <SelectItem key={entry.id} value={entry.id}>
                                {entry.name}
                                {entry.unit?.name ? ` · ${entry.unit?.name}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={row.unitId}
                          onValueChange={(value) => handleUnitChange(index, row.key, value)}
                          disabled={!item || !hasUnitChoices}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !item
                                  ? 'Select item first'
                                  : hasUnitChoices
                                    ? 'Select unit'
                                    : 'No units configured'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {!item ? (
                              <SelectItem value="" disabled>
                                Select an item first
                              </SelectItem>
                            ) : hasUnitChoices ? (
                              <>
                                {unitOptions.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.unit_id}>
                                    {unit.unit?.name || 'Unit'}
                                    {unit.unit?.abbreviation ? ` (${unit.unit.abbreviation})` : ''}
                                    {unit.unit_level > 1 ? ` · ${unit.conversion_factor}× base` : ''}
                                  </SelectItem>
                                ))}
                                {includeBaseUnitOption && item?.unit_id ? (
                                  <SelectItem value={item.unit_id}>
                                    {item.unit?.name || 'Default unit'}
                                    {item.unit?.abbreviation ? ` (${item.unit.abbreviation})` : ''}
                                  </SelectItem>
                                ) : null}
                              </>
                            ) : (
                              <SelectItem value="" disabled>
                                No units configured
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {unitError ? (
                          <p className="text-xs text-destructive">{unitError}</p>
                        ) : null}
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label>Quantity</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.quantity}
                            onChange={(event) => handleQuantityChange(index, event.target.value)}
                          />
                          <span className="text-xs text-muted-foreground">{unitLabel}</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label>Cost per unit</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.costPerUnit}
                          onChange={(event) => handleCostChange(index, event.target.value)}
                          placeholder={item?.cost_per_unit != null ? String(item.cost_per_unit) : '0.00'}
                        />
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove item</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
                <span className="text-muted-foreground">Estimated total</span>
                <span className="font-medium">{currencyFormatter.format(estimatedTotal || 0)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={createTransfer.isPending}>
                Clear
              </Button>
              <Button type="submit" disabled={createTransfer.isPending}>
                {createTransfer.isPending ? 'Submitting...' : 'Submit transfer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Transfer Activity
          </CardTitle>
          <CardDescription>
            Track requested, in-transit, and received transfers across your locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading transfers…</div>
          ) : transfersList.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No transfers have been created yet. Submit a transfer above to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {transfersList.map((transfer) => {
                const fulfillerName = formatEmployeeName(
                  transfer.fulfiller?.first_name,
                  transfer.fulfiller?.last_name,
                );
                const recipientName = formatEmployeeName(
                  transfer.recipient?.first_name,
                  transfer.recipient?.last_name,
                );
                const requesterName = formatEmployeeName(
                  transfer.requester?.first_name,
                  transfer.requester?.last_name,
                );

                return (
                  <div key={transfer.id} className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {transfer.from_location?.name ?? 'Unknown'} → {transfer.to_location?.name ?? 'Unknown'}
                          </h3>
                          <Badge className={cn(statusStyles[transfer.status])}>
                            {statusLabels[transfer.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Requested by {requesterName}</span>
                          <span>Fulfiller: {fulfillerName}</span>
                          <span>Recipient: {recipientName}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Requested {formatTimestamp(transfer.requested_at)}</span>
                          <span>Target delivery {formatDate(transfer.delivery_date)}</span>
                        </div>
                        {transfer.status_note && (
                          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                            {transfer.status_note}
                          </div>
                        )}
                      </div>
                      <div className="rounded-md border px-4 py-2 text-right">
                        <div className="text-xs uppercase text-muted-foreground">Total cost</div>
                        <div className="text-lg font-semibold">
                          {currencyFormatter.format(transfer.total_cost ?? 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Number.isFinite(Number(transfer.total_quantity))
                            ? `${Number(transfer.total_quantity).toFixed(2)} units`
                            : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-md border">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Quantity</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cost / unit</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Line total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(transfer.items ?? []).map((line) => {
                            const itemUnitLabel =
                              line.unit?.abbreviation || line.unit?.name || getItemUnitLabel(line.item);
                            const costPerUnit = line.cost_per_unit ?? line.item?.cost_per_unit ?? 0;
                            const lineTotal =
                              line.total_cost ??
                              (Number.isFinite(line.quantity) && Number.isFinite(costPerUnit)
                                ? Number(line.quantity) * Number(costPerUnit)
                                : 0);
                            return (
                              <tr key={line.id}>
                                <td className="px-3 py-2 text-foreground">{line.item?.name ?? 'Unknown item'}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {Number(line.quantity).toFixed(2)} {itemUnitLabel}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {currencyFormatter.format(Number(costPerUnit) || 0)}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {currencyFormatter.format(lineTotal || 0)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <CircleCheck className="h-4 w-4 text-primary" />
                          Audit trail
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          {(transfer.audit ?? []).length === 0 ? (
                            <p className="text-xs">No events recorded yet.</p>
                          ) : (
                            (transfer.audit ?? []).map((entry) => {
                              const actor = formatEmployeeName(
                                entry.actor?.first_name,
                                entry.actor?.last_name,
                              );
                              return (
                                <div key={entry.id} className="text-xs">
                                  <span className="font-medium text-foreground">
                                    {formatTimestamp(entry.created_at)}
                                  </span>{' '}
                                  — {actionLabels[entry.action] || entry.action} by {actor}
                                  {entry.note ? ` · ${entry.note}` : ''}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canMarkAsSent(transfer) && (
                          <Button
                            variant="secondary"
                            onClick={() => openStatusDialog(transfer, 'sent')}
                            disabled={updateTransferStatus.isPending}
                          >
                            Mark as sent
                          </Button>
                        )}
                        {canMarkAsReceived(transfer) && (
                          <Button
                            onClick={() => openStatusDialog(transfer, 'received')}
                            disabled={updateTransferStatus.isPending}
                          >
                            Mark as received
                          </Button>
                        )}
                        {canReject(transfer) && (
                          <Button
                            variant="outline"
                            onClick={() => openStatusDialog(transfer, 'rejected')}
                            disabled={updateTransferStatus.isPending}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject transfer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={statusDialog.open} onOpenChange={(open) => (!open ? closeStatusDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialog.action === 'sent' && 'Confirm transfer dispatch'}
              {statusDialog.action === 'received' && 'Confirm receipt'}
              {statusDialog.action === 'rejected' && 'Reject transfer'}
            </DialogTitle>
            <DialogDescription>
              {statusDialog.action === 'sent' &&
                'Let the recipient know the transfer is on the way.'}
              {statusDialog.action === 'received' &&
                'Confirm the items have arrived and update inventory status.'}
              {statusDialog.action === 'rejected' &&
                'Provide a short note explaining why this transfer is being rejected.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {statusDialog.transfer
                ? `${statusDialog.transfer.from_location?.name ?? 'Unknown'} → ${
                    statusDialog.transfer.to_location?.name ?? 'Unknown'
                  }`
                : ''}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-note">Note (optional)</Label>
              <Textarea
                id="status-note"
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                rows={3}
                placeholder="Add an optional note for recipients"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeStatusDialog}>
              Cancel
            </Button>
            <Button onClick={handleStatusSubmit} disabled={updateTransferStatus.isPending}>
              {updateTransferStatus.isPending ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
