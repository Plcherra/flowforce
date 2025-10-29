import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

  // Form state for waste
  const [wasteForm, setWasteForm] = useState({
    item_id: '',
    location_id: '',
    quantity: '',
    waste_type: '',
    reason: ''
  });

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wasteForm.item_id || !wasteForm.quantity || !wasteForm.waste_type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const selectedItem = items.find(item => item.id === wasteForm.item_id);
    
    try {
      await createWaste.mutateAsync({
        item_id: wasteForm.item_id,
        location_id: wasteForm.location_id || undefined,
        quantity: parseFloat(wasteForm.quantity),
        unit_id: selectedItem?.unit_id,
        waste_type: wasteForm.waste_type as any,
        reason: wasteForm.reason || undefined,
        cost_impact: selectedItem?.cost_per_unit ? 
          parseFloat(wasteForm.quantity) * selectedItem.cost_per_unit : undefined
      });
      
      // Reset form
      setWasteForm({
        item_id: '',
        location_id: '',
        quantity: '',
        waste_type: '',
        reason: ''
      });
    } catch (error) {
      // Error handled by the mutation
    }
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Adjustment Recorded',
      description: 'Inventory adjustment has been applied',
    });
  };

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="production" className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Production
              </TabsTrigger>
              <TabsTrigger value="waste" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Log Waste
              </TabsTrigger>
              <TabsTrigger value="adjustments" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Adjustments
              </TabsTrigger>
              <TabsTrigger value="transfers" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="production" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
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

            <TabsContent value="waste">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Log Waste
                  </CardTitle>
                  <CardDescription>
                    Record spoilage, prep errors, and other waste
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWasteSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <TabsContent value="adjustments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Inventory Adjustments
                  </CardTitle>
                  <CardDescription>
                    Correct inventory counts and make manual adjustments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adj-item">Item</Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
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
                        <Label htmlFor="adj-location">Location</Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
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
                        <Label htmlFor="adj-type">Adjustment Type</Label>
                        <Select required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="increase">Increase</SelectItem>
                            <SelectItem value="decrease">Decrease</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adj-quantity">Quantity</Label>
                        <Input 
                          id="adj-quantity"
                          type="number" 
                          step="0.1"
                          placeholder="0.0"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adj-reason">Reason</Label>
                      <Textarea 
                        id="adj-reason"
                        placeholder="Describe the reason for adjustment..."
                        rows={3}
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1">
                        Clear Form
                      </Button>
                      <Button type="submit" className="flex-1">
                        Apply Adjustment
                      </Button>
                    </div>
                  </form>
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
