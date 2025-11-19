import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Factory, Trash2, Settings, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventoryItems, useInventoryLocations, useCreateWaste } from '@/hooks/useInventory';
import { InventoryTransfersPanel } from '@/components/inventory/InventoryTransfersPanel';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';
import { ProductionEventForm } from '@/components/inventory/ProductionEventForm';
import { ProductionEventList } from '@/components/inventory/ProductionEventList';
import { useInventoryFormState } from '@/features/inventory/hooks/useInventoryForm';
import {
  wasteTypes,
  type WasteTypeValue,
  submitWasteForm,
  processAdjustmentForm,
} from './inventoryActionsHelpers';

export default function InventoryActionsPage() {
  const { toast } = useToast();
  // Fetch real data
  const {
    data: items = [],
    isLoading: itemsLoading,
    error: itemsError,
  } = useInventoryItems();
  const {
    data: locations = [],
    isLoading: locationsLoading,
    error: locationsError,
  } = useInventoryLocations();
  const createWaste = useCreateWaste();
  const isReferenceDataLoading = itemsLoading || locationsLoading;

  const {
    values: wasteForm,
    errors: wasteErrors,
    setField: setWasteField,
    setErrors: setWasteErrors,
    reset: resetWasteForm,
    showValidationToast,
  } = useInventoryFormState({
    item_id: '',
    location_id: '',
    quantity: '',
    waste_type: '' as WasteTypeValue | '',
    reason: '',
  });
  type WasteFormState = typeof wasteForm;

  const {
    values: adjustmentForm,
    errors: adjustmentErrors,
    setField: setAdjustmentField,
    setErrors: setAdjustmentErrors,
    reset: resetAdjustmentForm,
  } = useInventoryFormState({
    item_id: '',
    location_id: '',
    adjustment_type: '',
    quantity: '',
    reason: '',
  });
  type AdjustmentFormState = typeof adjustmentForm;

  const itemOptions = useMemo(
    () => items.map((item) => ({ id: item.id, label: `${item.name} (${item.unit?.name || 'units'})` })),
    [items],
  );
  const locationOptions = useMemo(
    () => locations.map((location) => ({ id: location.id, label: location.name })),
    [locations],
  );
  const wasteFormDisabled = createWaste.isPending || isReferenceDataLoading;
  const adjustmentFormDisabled = isReferenceDataLoading;

  const buildSelectHandler = useCallback(
    <Form extends Record<string, string>>(setter: (field: keyof Form, value: string) => void, field: keyof Form) =>
      (value: string) => setter(field, value),
    [],
  );

  const handleWasteSelect = useMemo(
    () => ({
      item: buildSelectHandler<WasteFormState>(setWasteField, 'item_id'),
      location: buildSelectHandler<WasteFormState>(setWasteField, 'location_id'),
      type: buildSelectHandler<WasteFormState>(setWasteField, 'waste_type'),
    }),
    [buildSelectHandler, setWasteField],
  );

  const handleAdjustmentSelect = useMemo(
    () => ({
      item: buildSelectHandler<AdjustmentFormState>(setAdjustmentField, 'item_id'),
      location: buildSelectHandler<AdjustmentFormState>(setAdjustmentField, 'location_id'),
      type: buildSelectHandler<AdjustmentFormState>(setAdjustmentField, 'adjustment_type'),
    }),
    [buildSelectHandler, setAdjustmentField],
  );

  const handleWasteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await submitWasteForm({
        form: wasteForm,
        items,
        setErrors: setWasteErrors,
        showValidationToast,
        resetForm: resetWasteForm,
        mutateWaste: createWaste.mutateAsync,
      });
    },
    [createWaste.mutateAsync, items, resetWasteForm, setWasteErrors, showValidationToast, wasteForm],
  );

  const handleAdjustmentSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const result = processAdjustmentForm({
        form: adjustmentForm,
        setErrors: setAdjustmentErrors,
        showValidationToast,
      });

      if (result === 'success') {
        toast({
          title: 'Adjustment recorded',
          description: 'Inventory adjustment has been applied.',
        });
        resetAdjustmentForm();
      }
    },
    [adjustmentForm, resetAdjustmentForm, setAdjustmentErrors, showValidationToast, toast],
  );

  const renderFormSkeleton = (
    <div className="space-y-4" aria-live="polite">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-md bg-muted/70 dark:bg-muted/40" />
          <Skeleton className="h-10 w-full rounded-md bg-muted/70 dark:bg-muted/40" />
        </div>
      ))}
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-md bg-muted/70 dark:bg-muted/40" />
        <Skeleton className="h-10 flex-1 rounded-md bg-muted/70 dark:bg-muted/40" />
      </div>
    </div>
  );

  const loadError = itemsError ?? locationsError;
  const showEmptyState =
    !isReferenceDataLoading && !loadError && (items.length === 0 || locations.length === 0);

  return (
    <InventoryLayout>
      <IfCan permission="inventory.view">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Actions</h1>
            <p className="text-muted-foreground">
              Record production, waste, adjustments, and transfers
            </p>
          </div>

          {loadError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load inventory data</AlertTitle>
              <AlertDescription>{loadError.message ?? 'Please refresh and try again.'}</AlertDescription>
            </Alert>
          )}

          {showEmptyState && (
            <Alert>
              <AlertTitle>Inventory setup required</AlertTitle>
              <AlertDescription>
                Add at least one inventory item and location to log waste or adjustments.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="production" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
              <TabsTrigger value="production" className="flex items-center justify-center gap-2 text-sm sm:text-base">
                <Factory className="h-4 w-4 text-primary" />
                Production
              </TabsTrigger>
              <TabsTrigger value="waste" className="flex items-center justify-center gap-2 text-sm sm:text-base">
                <Trash2 className="h-4 w-4 text-primary" />
                Log Waste
              </TabsTrigger>
              <TabsTrigger value="adjustments" className="flex items-center justify-center gap-2 text-sm sm:text-base">
                <Settings className="h-4 w-4 text-primary" />
                Adjustments
              </TabsTrigger>
              <TabsTrigger value="transfers" className="flex items-center justify-center gap-2 text-sm sm:text-base">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Transfers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="production" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-primary" />
                    Record Production Event
                  </CardTitle>
                  <CardDescription>
                    Track material usage, yield, and costs for prep, batch, cooked, or baked production runs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductionEventForm />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Production Events</CardTitle>
                  <CardDescription>
                    Cost summaries and material usage for the most recent production runs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductionEventList />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waste" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-primary" />
                    Log Waste
                  </CardTitle>
                  <CardDescription>
                    Record spoilage, prep errors, and other waste
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isReferenceDataLoading ? (
                    renderFormSkeleton
                  ) : (
                    <form onSubmit={handleWasteSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="waste-item">Item *</Label>
                          <Select
                            value={wasteForm.item_id}
                            onValueChange={handleWasteSelect.item}
                            disabled={wasteFormDisabled || !itemOptions.length}
                            required
                          >
                            <SelectTrigger aria-invalid={Boolean(wasteErrors.item_id)}>
                              <SelectValue placeholder={itemOptions.length ? 'Select item' : 'No items available'} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemOptions.length ? (
                                itemOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  Add an inventory item first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {wasteErrors.item_id && (
                            <p className="text-sm text-destructive">{wasteErrors.item_id}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="waste-location">Location</Label>
                          <Select
                            value={wasteForm.location_id}
                            onValueChange={handleWasteSelect.location}
                            disabled={wasteFormDisabled || !locationOptions.length}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={locationOptions.length ? 'Select location' : 'No locations yet'} />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.length ? (
                                locationOptions.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  Create a location first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="waste-quantity">Quantity *</Label>
                          <Input
                            id="waste-quantity"
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            placeholder="0.0"
                            value={wasteForm.quantity}
                            onChange={(e) => setWasteField('quantity', e.target.value)}
                            required
                            aria-invalid={Boolean(wasteErrors.quantity)}
                            disabled={wasteFormDisabled}
                          />
                          {wasteErrors.quantity && (
                            <p className="text-sm text-destructive">{wasteErrors.quantity}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="waste-type">Waste Type *</Label>
                          <Select
                            value={wasteForm.waste_type}
                            onValueChange={handleWasteSelect.type}
                            disabled={wasteFormDisabled}
                            required
                          >
                            <SelectTrigger aria-invalid={Boolean(wasteErrors.waste_type)}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {wasteTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {wasteErrors.waste_type && (
                            <p className="text-sm text-destructive">{wasteErrors.waste_type}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="waste-reason">Reason/Notes</Label>
                        <Textarea
                          id="waste-reason"
                          placeholder="Describe the reason for waste..."
                          rows={3}
                          value={wasteForm.reason}
                          onChange={(e) => setWasteField('reason', e.target.value)}
                          disabled={wasteFormDisabled}
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            resetWasteForm();
                            setWasteErrors({});
                          }}
                          disabled={wasteFormDisabled}
                        >
                          Clear Form
                        </Button>
                        <Button type="submit" className="flex-1" disabled={wasteFormDisabled}>
                          {createWaste.isPending ? 'Recording...' : 'Log Waste'}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Inventory Adjustments
                  </CardTitle>
                  <CardDescription>
                    Correct inventory counts and make manual adjustments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isReferenceDataLoading ? (
                    renderFormSkeleton
                  ) : (
                    <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="adj-item">Item *</Label>
                          <Select
                            value={adjustmentForm.item_id}
                            onValueChange={handleAdjustmentSelect.item}
                            disabled={adjustmentFormDisabled || !itemOptions.length}
                            required
                          >
                            <SelectTrigger aria-invalid={Boolean(adjustmentErrors.item_id)}>
                              <SelectValue placeholder={itemOptions.length ? 'Select item' : 'No items available'} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemOptions.length ? (
                                itemOptions.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  Add an inventory item first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {adjustmentErrors.item_id && (
                            <p className="text-sm text-destructive">{adjustmentErrors.item_id}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adj-location">Location *</Label>
                          <Select
                            value={adjustmentForm.location_id}
                            onValueChange={handleAdjustmentSelect.location}
                            disabled={adjustmentFormDisabled || !locationOptions.length}
                            required
                          >
                            <SelectTrigger aria-invalid={Boolean(adjustmentErrors.location_id)}>
                              <SelectValue placeholder={locationOptions.length ? 'Select location' : 'No locations yet'} />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.length ? (
                                locationOptions.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  Create a location first
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {adjustmentErrors.location_id && (
                            <p className="text-sm text-destructive">{adjustmentErrors.location_id}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adj-type">Adjustment Type *</Label>
                          <Select
                            value={adjustmentForm.adjustment_type}
                            onValueChange={handleAdjustmentSelect.type}
                            disabled={adjustmentFormDisabled}
                            required
                          >
                            <SelectTrigger aria-invalid={Boolean(adjustmentErrors.adjustment_type)}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increase">Increase</SelectItem>
                              <SelectItem value="decrease">Decrease</SelectItem>
                            </SelectContent>
                          </Select>
                          {adjustmentErrors.adjustment_type && (
                            <p className="text-sm text-destructive">{adjustmentErrors.adjustment_type}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adj-quantity">Quantity *</Label>
                        <Input
                            id="adj-quantity"
                            type="number"
                            step="0.1"
                            min="0"
                            inputMode="decimal"
                            placeholder="0.0"
                            value={adjustmentForm.quantity}
                            onChange={(e) => setAdjustmentField('quantity', e.target.value)}
                            required
                            aria-invalid={Boolean(adjustmentErrors.quantity)}
                            disabled={adjustmentFormDisabled}
                          />
                          {adjustmentErrors.quantity && (
                            <p className="text-sm text-destructive">{adjustmentErrors.quantity}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adj-reason">Reason *</Label>
                      <Textarea
                          id="adj-reason"
                          placeholder="Describe the reason for adjustment..."
                          rows={3}
                          value={adjustmentForm.reason}
                          onChange={(e) => setAdjustmentField('reason', e.target.value)}
                          required
                          aria-invalid={Boolean(adjustmentErrors.reason)}
                          disabled={adjustmentFormDisabled}
                        />
                        {adjustmentErrors.reason && (
                          <p className="text-sm text-destructive">{adjustmentErrors.reason}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            resetAdjustmentForm();
                            setAdjustmentErrors({});
                          }}
                          disabled={adjustmentFormDisabled}
                        >
                          Clear Form
                        </Button>
                        <Button type="submit" className="flex-1" disabled={adjustmentFormDisabled}>
                          Apply Adjustment
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfers">
              <InventoryTransfersPanel />
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
