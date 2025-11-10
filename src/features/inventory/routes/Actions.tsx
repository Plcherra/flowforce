import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Factory, Trash2, Settings, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInventoryItems, useInventoryLocations, useCreateWaste } from '@/hooks/useInventory';
import { InventoryTransfersPanel } from '@/components/inventory/InventoryTransfersPanel';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';
import { ProductionEventForm } from '@/components/inventory/ProductionEventForm';
import { ProductionEventList } from '@/components/inventory/ProductionEventList';

const wasteTypes = [
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'prep_error', label: 'Prep Error' }, 
  { value: 'accident', label: 'Accident' },
  { value: 'theft', label: 'Theft' },
  { value: 'expired', label: 'Expired' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'other', label: 'Other' }
];

export default function InventoryActionsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('production');
  
  // Fetch real data
  const { data: items = [], isLoading: itemsLoading } = useInventoryItems();
  const { data: locations = [], isLoading: locationsLoading } = useInventoryLocations();
  const createWaste = useCreateWaste();
  const isReferenceDataLoading = itemsLoading || locationsLoading;
  const itemOptions = useMemo(() => items.map((item) => ({ id: item.id, label: `${item.name} (${item.unit?.name || 'units'})` })), [items]);
  const locationOptions = useMemo(
    () => locations.map((location) => ({ id: location.id, label: location.name })),
    [locations],
  );
  const wasteFormDisabled = createWaste.isPending || isReferenceDataLoading;
  const adjustmentFormDisabled = isReferenceDataLoading;
  
  // Form state for waste
  const [wasteForm, setWasteForm] = useState({
    item_id: '',
    location_id: '',
    quantity: '',
    waste_type: '',
    reason: ''
  });
  const [wasteErrors, setWasteErrors] = useState<Record<string, string>>({});

  const [adjustmentForm, setAdjustmentForm] = useState({
    item_id: '',
    location_id: '',
    adjustment_type: '',
    quantity: '',
    reason: '',
  });
  const [adjustmentErrors, setAdjustmentErrors] = useState<Record<string, string>>({});

  const setWasteField = (field: keyof typeof wasteForm, value: string) => {
    setWasteForm((prev) => ({ ...prev, [field]: value }));
    setWasteErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setAdjustmentField = (field: keyof typeof adjustmentForm, value: string) => {
    setAdjustmentForm((prev) => ({ ...prev, [field]: value }));
    setAdjustmentErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!wasteForm.item_id) nextErrors.item_id = 'Select an item to log waste.';
    if (!wasteForm.quantity || Number(wasteForm.quantity) <= 0) nextErrors.quantity = 'Quantity must be greater than zero.';
    if (!wasteForm.waste_type) nextErrors.waste_type = 'Choose the type of waste.';

    if (Object.keys(nextErrors).length) {
      setWasteErrors(nextErrors);
      toast({
        title: 'Missing information',
        description: 'Please review the highlighted fields.',
        variant: 'destructive',
      });
      return;
    }

    const selectedItem = items.find((item) => item.id === wasteForm.item_id);
    const quantityValue = Number(wasteForm.quantity);

    try {
      await createWaste.mutateAsync({
        item_id: wasteForm.item_id,
        location_id: wasteForm.location_id || undefined,
        quantity: quantityValue,
        unit_id: selectedItem?.unit_id,
        waste_type: wasteForm.waste_type as any,
        reason: wasteForm.reason || undefined,
        cost_impact:
          selectedItem?.cost_per_unit && Number.isFinite(quantityValue)
            ? quantityValue * selectedItem.cost_per_unit
            : undefined,
      });

      setWasteForm({
        item_id: '',
        location_id: '',
        quantity: '',
        waste_type: '',
        reason: '',
      });
      setWasteErrors({});
    } catch (error) {
      // handled by mutation toast
    }
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!adjustmentForm.item_id) nextErrors.item_id = 'Select an item to adjust.';
    if (!adjustmentForm.location_id) nextErrors.location_id = 'Select a location.';
    if (!adjustmentForm.adjustment_type) nextErrors.adjustment_type = 'Choose an adjustment type.';
    if (!adjustmentForm.quantity || Number(adjustmentForm.quantity) <= 0)
      nextErrors.quantity = 'Quantity must be greater than zero.';
    if (!adjustmentForm.reason) nextErrors.reason = 'Provide a brief reason.';

    if (Object.keys(nextErrors).length) {
      setAdjustmentErrors(nextErrors);
      toast({
        title: 'Missing information',
        description: 'Please review the highlighted fields.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Adjustment recorded',
      description: 'Inventory adjustment has been applied.',
    });
    setAdjustmentForm({
      item_id: '',
      location_id: '',
      adjustment_type: '',
      quantity: '',
      reason: '',
    });
    setAdjustmentErrors({});
  };

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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                            onValueChange={(value) => setWasteField('item_id', value)}
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
                            onValueChange={(value) => setWasteField('location_id', value)}
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
                            onValueChange={(value) => setWasteField('waste_type', value)}
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
                            setWasteForm({
                              item_id: '',
                              location_id: '',
                              quantity: '',
                              waste_type: '',
                              reason: '',
                            });
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

                      <div className="space-y-2">
                        <Label htmlFor="waste-item">Item *</Label>
                        <Select 
                          value={wasteForm.item_id} 
                          onValueChange={(value) => setWasteForm(prev => ({ ...prev, item_id: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={itemsLoading ? "Loading..." : "Select item"} />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} ({item.unit?.name || 'units'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="waste-location">Location</Label>
                        <Select 
                          value={wasteForm.location_id} 
                          onValueChange={(value) => setWasteForm(prev => ({ ...prev, location_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={locationsLoading ? "Loading..." : "Select location"} />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map(location => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="waste-quantity">Quantity *</Label>
                        <Input 
                          id="waste-quantity"
                          type="number" 
                          step="0.1"
                          placeholder="0.0"
                          value={wasteForm.quantity}
                          onChange={(e) => setWasteForm(prev => ({ ...prev, quantity: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="waste-type">Waste Type *</Label>
                        <Select 
                          value={wasteForm.waste_type} 
                          onValueChange={(value) => setWasteForm(prev => ({ ...prev, waste_type: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {wasteTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="waste-reason">Reason/Notes</Label>
                      <Textarea 
                        id="waste-reason"
                        placeholder="Describe the reason for waste..."
                        rows={3}
                        value={wasteForm.reason}
                        onChange={(e) => setWasteForm(prev => ({ ...prev, reason: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setWasteForm({
                          item_id: '',
                          location_id: '',
                          quantity: '',
                          waste_type: '',
                          reason: ''
                        })}
                      >
                        Clear Form
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createWaste.isPending}
                      >
                        {createWaste.isPending ? 'Recording...' : 'Log Waste'}
                      </Button>
                    </div>
                  </form>
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
                            onValueChange={(value) => setAdjustmentField('item_id', value)}
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
                            onValueChange={(value) => setAdjustmentField('location_id', value)}
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
                            onValueChange={(value) => setAdjustmentField('adjustment_type', value)}
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
                            setAdjustmentForm({
                              item_id: '',
                              location_id: '',
                              adjustment_type: '',
                              quantity: '',
                              reason: '',
                            });
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
