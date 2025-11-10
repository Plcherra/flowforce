import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory';
import { useInventoryCategories, useCreateInventoryCategory, useDeleteInventoryCategory } from '@/hooks/useInventory';
import { useInventoryUnits, useInventoryLocations, useCreateInventoryLocation, useDeleteInventoryLocation, useInventorySuppliers, useCreateSupplier } from '@/hooks/useInventory';
import { useCreateItemUnit, useItemUnits, useUpdateItemUnit, useDeleteItemUnit } from '@/hooks/inventory/useItemUnits';
import { useProfile } from '@/hooks/useProfile';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import ClickableLabel from './ClickableLabel';
import type { InventoryItem } from '@/hooks/inventory/types';

interface UnitLevel {
  id?: string;
  unit_id: string;
  unit_level: number;
  cost_per_unit: string;
  conversion_factor: string;
}

interface InventoryItemFormProps {
  children?: React.ReactNode;
  editItem?: InventoryItem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FieldConfig {
  unitTypeSize: boolean;
  location: boolean;
  supplier: boolean;
  stockLevels: boolean;
  shelfLife: boolean;
  sku: boolean;
  barcode: boolean;
  description: boolean;
}

const defaultConfig: FieldConfig = {
  unitTypeSize: true,
  location: true,
  supplier: true,
  stockLevels: true,
  shelfLife: true,
  sku: true,
  barcode: true,
  description: true,
};

export default function InventoryItemForm({ children, editItem, open: controlledOpen, onOpenChange }: InventoryItemFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [categoryInput, setCategoryInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [fieldConfig, setFieldConfig] = useState<FieldConfig>(defaultConfig);
  const categoryRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const supplierRef = useRef<HTMLDivElement>(null);
  
  // Initialize form data with edit item if provided
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    category_id: '',
    barcode: '',
    sku: '',
    cost_per_unit: '',
    min_stock_level: '',
    max_stock_level: '',
    unit_id: '',
    unit_quantity: '1',
    default_location_id: '',
    preferred_supplier_id: '',
    shelf_life_days: '',
    recipe_yield_quantity: '',
    recipe_yield_unit_id: '',
  });
  
  // Multi-unit state - start with one unit
  const [unitLevels, setUnitLevels] = useState<UnitLevel[]>([{
    id: undefined,
    unit_id: '',
    unit_level: 1,
    cost_per_unit: '',
    conversion_factor: '1',
  }]);
  const [removedUnitIds, setRemovedUnitIds] = useState<string[]>([]);

  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { data: categories } = useInventoryCategories();
  const { data: units } = useInventoryUnits();
  const { data: locations } = useInventoryLocations();
  const { data: suppliers } = useInventorySuppliers(companyId);
  const { symbol: currencySymbol } = useCurrency();
  const { units: existingItemUnits } = useItemUnits(editItem?.id);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const createItemUnit = useCreateItemUnit();
  const updateItemUnit = useUpdateItemUnit();
  const deleteItemUnit = useDeleteItemUnit();
  const createCategory = useCreateInventoryCategory();
  const deleteCategory = useDeleteInventoryCategory();
  const createLocation = useCreateInventoryLocation();
  const deleteLocation = useDeleteInventoryLocation();
  const createSupplier = useCreateSupplier();

  // Auto-calculate unit prices based on conversion factors
  const calculateDerivedPrices = (units: UnitLevel[]) => {
    if (!units.length) return units;

    const baseCost = parseFloat(units[0]?.cost_per_unit || '0');
    return units.map((unit, index) => {
      if (index === 0) {
        return {
          ...unit,
          conversion_factor: unit.conversion_factor || '1',
        };
      }

      const conversionFactor = parseFloat(unit.conversion_factor || '0');
      if (!baseCost || !conversionFactor) {
        return unit;
      }

      return {
        ...unit,
        cost_per_unit: (baseCost * conversionFactor).toFixed(2),
      };
    });
  };

  // Update form data when editItem changes
  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        description: editItem.description || '',
        category: editItem.category || editItem.category_details?.name || '',
        category_id: editItem.category_id || editItem.category_details?.id || '',
        barcode: editItem.barcode || '',
        sku: editItem.sku || '',
        cost_per_unit: editItem.cost_per_unit?.toString() || '',
        min_stock_level: editItem.min_stock_level?.toString() || '',
        max_stock_level: editItem.max_stock_level?.toString() || '',
        unit_id: editItem.unit_id || '',
        unit_quantity: editItem.unit_quantity?.toString() || '1',
        default_location_id: editItem.default_location_id || '',
        preferred_supplier_id: editItem.preferred_supplier_id || '',
        shelf_life_days: editItem.shelf_life_days?.toString() || '',
        recipe_yield_quantity: editItem.recipe_yield_quantity?.toString() || '',
        recipe_yield_unit_id: editItem.recipe_yield_unit_id || '',
      });
      setCategoryInput(editItem.category_details?.name || editItem.category || '');

      const location = locations?.find(loc => loc.id === editItem.default_location_id);
      setLocationInput(location?.name || '');

      const supplier = suppliers?.find(sp => sp.id === editItem.preferred_supplier_id);
      setSupplierInput(supplier?.name || '');

      if (existingItemUnits && existingItemUnits.length > 0) {
        const loadedUnits = existingItemUnits.map((itemUnit) => ({
          id: itemUnit.id,
          unit_id: itemUnit.unit_id,
          unit_level: itemUnit.unit_level,
          cost_per_unit: itemUnit.cost_per_unit?.toString() || '',
          conversion_factor: itemUnit.conversion_factor?.toString() || '1',
        }));

        // Ensure base unit conversion factor locked to 1
        if (loadedUnits[0]) {
          loadedUnits[0].conversion_factor = '1';
        }

        setUnitLevels(loadedUnits);
      } else {
        setUnitLevels([{
          id: undefined,
          unit_id: editItem.unit_id || '',
          unit_level: 1,
          cost_per_unit: editItem.cost_per_unit?.toString() || '',
          conversion_factor: '1',
        }]);
      }
      setRemovedUnitIds([]);
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        category_id: '',
        barcode: '',
        sku: '',
        cost_per_unit: '',
        min_stock_level: '',
        max_stock_level: '',
        unit_id: '',
        unit_quantity: '1',
        default_location_id: '',
        preferred_supplier_id: '',
        shelf_life_days: '',
        recipe_yield_quantity: '',
        recipe_yield_unit_id: '',
      });
      setCategoryInput('');
      setLocationInput('');
      setSupplierInput('');
      setUnitLevels([{
        id: undefined,
        unit_id: '',
        unit_level: 1,
        cost_per_unit: '',
        conversion_factor: '1',
      }]);
      setRemovedUnitIds([]);
    }
  }, [editItem, locations, suppliers, existingItemUnits]);

  // Filter categories based on input
  const filteredCategories = categories?.filter(cat => 
    cat.name.toLowerCase().includes(categoryInput.toLowerCase())
  ) || [];

  // Filter locations based on input
  const filteredLocations = locations?.filter(loc => 
    loc.name.toLowerCase().includes(locationInput.toLowerCase())
  ) || [];

  // Filter suppliers based on input
  const filteredSuppliers = suppliers?.filter(supplier => 
    supplier.name.toLowerCase().includes(supplierInput.toLowerCase())
  ) || [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setShowSupplierSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (category: { id: string; name: string }) => {
    setCategoryInput(category.name);
    setFormData({ ...formData, category: category.name, category_id: category.id });
    setShowSuggestions(false);
  };

  const handleCreateCategory = async () => {
    if (!categoryInput.trim()) return;
    
    try {
      const newCategory = await createCategory.mutateAsync({ 
        name: categoryInput.trim() 
      });
      setFormData({ ...formData, category: newCategory.name, category_id: newCategory.id });
      setShowSuggestions(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
      try {
        await deleteCategory.mutateAsync(categoryId);
        // Clear the input and selection if the deleted category was selected
        if (formData.category_id === categoryId) {
          setCategoryInput('');
          setFormData({ ...formData, category: '', category_id: '' });
        }
        setShowSuggestions(false);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const handleLocationSelect = (location: { id: string; name: string }) => {
    setLocationInput(location.name);
    setFormData({ ...formData, default_location_id: location.id });
    setShowLocationSuggestions(false);
  };

  const handleCreateLocation = async () => {
    if (!locationInput.trim()) return;
    
    try {
      const newLocation = await createLocation.mutateAsync({ 
        name: locationInput.trim(),
        location_type: 'storage' // default type
      });
      setFormData({ ...formData, default_location_id: newLocation.id });
      setLocationInput(newLocation.name || locationInput.trim());
      setShowLocationSuggestions(false);
    } catch (error) {
      console.error('Failed to create location:', error);
    }
  };

  const handleSupplierSelect = (supplier: { id: string; name: string }) => {
    setSupplierInput(supplier.name);
    setFormData({ ...formData, preferred_supplier_id: supplier.id });
    setShowSupplierSuggestions(false);
  };

  const handleCreateSupplier = async () => {
    if (!supplierInput.trim()) return;
    
    try {
      const newSupplier = await createSupplier.mutateAsync({ 
        name: supplierInput.trim()
      });
      setFormData({ ...formData, preferred_supplier_id: newSupplier.id });
      setSupplierInput(newSupplier.name || supplierInput.trim());
      setShowSupplierSuggestions(false);
    } catch (error) {
      console.error('Failed to create supplier:', error);
    }
  };

  const categoryExists = categories?.some(cat => 
    cat.name.toLowerCase() === categoryInput.toLowerCase()
  );

  const locationExists = locations?.some(loc => 
    loc.name.toLowerCase() === locationInput.toLowerCase()
  );

  const supplierExists = suppliers?.some(supplier => 
    supplier.name.toLowerCase() === supplierInput.toLowerCase()
  );

  const handleDeleteLocation = async (locationId: string, locationName: string) => {
    if (confirm(`Are you sure you want to delete the location "${locationName}"?`)) {
      try {
        await deleteLocation.mutateAsync(locationId);
        // Clear the input and selection if the deleted location was selected
        if (formData.default_location_id === locationId) {
          setLocationInput('');
          setFormData({ ...formData, default_location_id: '' });
        }
        setShowLocationSuggestions(false);
      } catch (error) {
        console.error('Failed to delete location:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
      toast({
        title: 'Missing company information',
        description: 'Please sign in again to continue creating inventory items.',
        variant: 'destructive',
      });
      return;
    }

    const parsedYieldQuantity = formData.recipe_yield_quantity
      ? parseFloat(formData.recipe_yield_quantity)
      : undefined;
    const recipeYieldQuantity = parsedYieldQuantity && parsedYieldQuantity > 0 ? parsedYieldQuantity : undefined;
    const recipeYieldUnitId = recipeYieldQuantity
      ? (formData.recipe_yield_unit_id || formData.unit_id || units?.[0]?.id)
      : undefined;

    const itemData = {
      company_id: profile.company_id,
      name: formData.name,
      description: formData.description || undefined,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      category: formData.category || undefined,
      category_id: formData.category_id || undefined,
      unit_id: formData.unit_id || units?.[0]?.id,
      unit_quantity: formData.unit_quantity ? parseFloat(formData.unit_quantity) : 1,
      cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : undefined,
      default_location_id: formData.default_location_id || undefined,
      preferred_supplier_id: formData.preferred_supplier_id || undefined,
      min_stock_level: formData.min_stock_level ? parseFloat(formData.min_stock_level) : 0,
      max_stock_level: formData.max_stock_level ? parseFloat(formData.max_stock_level) : undefined,
      shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : undefined,
      recipe_yield_quantity: recipeYieldQuantity,
      recipe_yield_unit_id: recipeYieldUnitId,
      is_prep_item: false,
      is_active: true,
      created_by: profile.id,
    };

    try {
      let savedItem;
      if (editItem) {
        // Update existing item
        savedItem = await updateItem.mutateAsync({
          id: editItem.id,
          updates: itemData
        });
        savedItem = { ...editItem, ...itemData }; // Use existing item with updates
      } else {
        // Create new item
        savedItem = await createItem.mutateAsync(itemData);
      }
      
      // Upsert unit configurations after item save
      if (savedItem?.id && unitLevels.length > 0) {
        for (const unitLevel of unitLevels) {
          if (!unitLevel.unit_id) continue;

          const conversionFactor = unitLevel.unit_level === 1
            ? 1
            : (parseFloat(unitLevel.conversion_factor) || 1);

          const payload = {
            item_id: savedItem.id,
            unit_id: unitLevel.unit_id,
            unit_level: unitLevel.unit_level,
            conversion_factor: conversionFactor,
            is_primary: unitLevel.unit_level === 1,
            is_countable: true,
            cost_per_unit: unitLevel.cost_per_unit ? parseFloat(unitLevel.cost_per_unit) : null,
          };

          try {
            if (unitLevel.id) {
              await updateItemUnit.mutateAsync({ id: unitLevel.id, ...payload });
            } else {
              const createdUnit = await createItemUnit.mutateAsync(payload);
              if (createdUnit?.id) {
                unitLevel.id = createdUnit.id;
              }
            }
          } catch (unitError) {
            console.warn('Failed to upsert unit level:', unitError);
          }
        }

        for (const removedId of removedUnitIds) {
          try {
            await deleteItemUnit.mutateAsync(removedId);
          } catch (deleteError) {
            console.warn('Failed to delete unit level:', deleteError);
          }
        }
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: '',
        category_id: '',
        barcode: '',
        sku: '',
        cost_per_unit: '',
        min_stock_level: '',
        max_stock_level: '',
        unit_id: '',
        unit_quantity: '1',
        default_location_id: '',
        preferred_supplier_id: '',
        shelf_life_days: '',
        recipe_yield_quantity: '',
        recipe_yield_unit_id: '',
      });
      setCategoryInput('');
      setLocationInput('');
      setSupplierInput('');
      setUnitLevels([{
        id: undefined,
        unit_id: '',
        unit_level: 1,
        cost_per_unit: '',
        conversion_factor: '1',
      }]);
      setRemovedUnitIds([]);
      setFieldConfig(defaultConfig);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save inventory item:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
          <p className="text-sm text-muted-foreground">Click on field labels to enable/disable them</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          <div>
            <ClickableLabel 
              htmlFor="sku" 
              enabled={fieldConfig.sku}
              onClick={() => setFieldConfig({ ...fieldConfig, sku: !fieldConfig.sku })}
            >
              SKU
            </ClickableLabel>
            {fieldConfig.sku && (
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            )}
          </div>
          <div>
            <ClickableLabel
              htmlFor="barcode"
              enabled={fieldConfig.barcode}
              onClick={() => setFieldConfig({ ...fieldConfig, barcode: !fieldConfig.barcode })}
            >
              Barcode
            </ClickableLabel>
            {fieldConfig.barcode && (
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="UPC / EAN / internal code"
              />
            )}
          </div>
        </div>

          <div>
            <ClickableLabel 
              htmlFor="description" 
              enabled={fieldConfig.description}
              onClick={() => setFieldConfig({ ...fieldConfig, description: !fieldConfig.description })}
            >
              Description
            </ClickableLabel>
            {fieldConfig.description && (
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            )}
           </div>

          <div>
            <ClickableLabel 
              htmlFor="supplier" 
              enabled={fieldConfig.supplier}
              onClick={() => setFieldConfig({ ...fieldConfig, supplier: !fieldConfig.supplier })}
            >
              Supplier
            </ClickableLabel>
            {fieldConfig.supplier && (
              <div className="relative" ref={supplierRef}>
                <div className="relative">
                  <Input
                    id="supplier"
                    value={supplierInput}
                    onChange={(e) => {
                      setSupplierInput(e.target.value);
                      const matchingSupplier = suppliers?.find(s => 
                        s.name.toLowerCase() === e.target.value.toLowerCase()
                      );
                      if (matchingSupplier) {
                        setFormData({ ...formData, preferred_supplier_id: matchingSupplier.id });
                      } else {
                        setFormData({ ...formData, preferred_supplier_id: '' });
                      }
                    }}
                    onFocus={() => setShowSupplierSuggestions(true)}
                    placeholder="Enter or select supplier"
                    className="pr-10 bg-background border z-50"
                  />
                  {supplierInput && !supplierExists && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateSupplier}
                      disabled={createSupplier.isPending}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
                    {filteredSuppliers.map((supplier) => (
                      <button
                        key={supplier.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground bg-background"
                        onClick={() => handleSupplierSelect(supplier)}
                      >
                        {supplier.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={categoryRef}>
            <Label htmlFor="category">Category</Label>
            <div className="relative">
              <Input
                id="category"
                value={categoryInput}
                onChange={(e) => {
                  setCategoryInput(e.target.value);
                  setShowSuggestions(true);
                  // Clear selection if input doesn't match selected category
                  const matchingCategory = categories?.find(cat => 
                    cat.name.toLowerCase() === e.target.value.toLowerCase()
                  );
                  if (matchingCategory) {
                    setFormData({ ...formData, category: matchingCategory.name, category_id: matchingCategory.id });
                  } else {
                    setFormData({ ...formData, category: '', category_id: '' });
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Enter or select category"
                className="pr-10"
              />
              {categoryInput && !categoryExists && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={createCategory.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {showSuggestions && filteredCategories.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
                {filteredCategories.map((category) => (
                  <div key={category.id} className="flex items-center group">
                    <button
                      type="button"
                      className="flex-1 text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleCategorySelect(category)}
                    >
                      {category.name}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id, category.name);
                      }}
                      disabled={deleteCategory.isPending}
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Minus className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <ClickableLabel 
              htmlFor="units" 
              enabled={fieldConfig.unitTypeSize}
              onClick={() => setFieldConfig({ ...fieldConfig, unitTypeSize: !fieldConfig.unitTypeSize })}
            >
              Units Configuration
            </ClickableLabel>
            {fieldConfig.unitTypeSize && (
              <div className="mt-4 space-y-6">
                {unitLevels.map((unit, index) => (
                  <div key={unit.id ?? index} className={cn(
                    "border rounded-lg p-4 space-y-4 transition-all",
                    index === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-foreground">Unit {index + 1}</span>
                        {index === 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            Base Unit
                          </span>
                        )}
                      </div>
                      {unitLevels.length > 1 && index > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (unit.id) {
                              const unitId = unit.id;
                              setRemovedUnitIds((prev) => (prev.includes(unitId) ? prev : [...prev, unitId]));
                            }
                            const newUnits = unitLevels.filter((_, i) => i !== index);
                            const reindexedUnits = newUnits.map((u, idx) => ({ ...u, unit_level: idx + 1 }));
                            setUnitLevels(reindexedUnits);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Unit</Label>
                        <Select
                          value={unit.unit_id || ''}
                          onValueChange={(value) => {
                            const newUnits = [...unitLevels];
                            newUnits[index] = { ...newUnits[index], unit_id: value };
                            setUnitLevels(newUnits);
                            if (index === 0) {
                              setFormData((prev) => ({ ...prev, unit_id: value }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50 max-h-56 overflow-auto">
                            {units?.map((availableUnit) => (
                              <SelectItem key={availableUnit.id} value={availableUnit.id}>
                                {availableUnit.name} ({availableUnit.abbreviation})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {index === 0 ? 'Conversion Factor' : 'Conversion Factor (Base Units)'}
                        </Label>
                        <Input
                          placeholder="1"
                          type="number"
                          step="0.01"
                          value={index === 0 ? '1' : (unit.conversion_factor || '')}
                          onChange={(e) => {
                            const value = index === 0 ? '1' : e.target.value;
                            const newUnits = [...unitLevels];
                            newUnits[index] = { ...newUnits[index], conversion_factor: value };
                            const updatedUnits = calculateDerivedPrices(newUnits);
                            setUnitLevels(updatedUnits);
                          }}
                          readOnly={index === 0}
                          className={cn(
                            "h-10",
                            index === 0 && "bg-muted cursor-not-allowed text-muted-foreground"
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Cost per Unit {index > 0 && unit.conversion_factor && unitLevels[0].cost_per_unit && (
                            <span className="text-xs text-primary ml-1">(Auto)</span>
                          )}
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                          value={unit.cost_per_unit || ''}
                          onChange={(e) => {
                            const newUnits = [...unitLevels];
                            newUnits[index] = { ...newUnits[index], cost_per_unit: e.target.value };
                            if (index === 0) {
                              setFormData((prev) => ({ ...prev, cost_per_unit: e.target.value }));
                              const recalculated = calculateDerivedPrices(newUnits);
                              setUnitLevels(recalculated);
                            } else {
                              setUnitLevels(newUnits);
                            }
                          }}
                            readOnly={index > 0 && !!unit.conversion_factor && !!unitLevels[0].cost_per_unit}
                            className={cn(
                              "h-10 pl-8",
                              index > 0 && unit.conversion_factor && unitLevels[0].cost_per_unit &&
                                "bg-muted/50 text-muted-foreground cursor-default"
                            )}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            {currencySymbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {index > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Set the number of base units contained in this unit (e.g., 1 Case = 12 Each).
                      </p>
                    )}
                  </div>
                ))}
                
                {/* Add Unit Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUnitLevels([...unitLevels, { 
                      id: undefined,
                      unit_id: '', 
                      unit_level: unitLevels.length + 1,
                      cost_per_unit: '',
                      conversion_factor: '',
                    }]);
                  }}
                  className="w-full h-12 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Unit
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <ClickableLabel 
                htmlFor="default_location_id" 
                enabled={fieldConfig.location}
                onClick={() => setFieldConfig({ ...fieldConfig, location: !fieldConfig.location })}
              >
                Default Location
              </ClickableLabel>
              {fieldConfig.location && (
                <div className="relative" ref={locationRef}>
                  <div className="relative">
                    <Input
                      id="default_location_id"
                      value={locationInput}
                      onChange={(e) => {
                        setLocationInput(e.target.value);
                        setShowLocationSuggestions(true);
                        // Clear selection if input doesn't match selected location
                        const matchingLocation = locations?.find(loc => 
                          loc.name.toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (matchingLocation) {
                          setFormData({ ...formData, default_location_id: matchingLocation.id });
                        } else {
                          setFormData({ ...formData, default_location_id: '' });
                        }
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      placeholder="Enter or select location"
                      className="pr-10"
                    />
                    {locationInput && !locationExists && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateLocation}
                        disabled={createLocation.isPending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {showLocationSuggestions && filteredLocations.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-32 overflow-y-auto">
                      {filteredLocations.map((location) => (
                        <div key={location.id} className="flex items-center group">
                          <button
                            type="button"
                            className="flex-1 text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleLocationSelect(location)}
                          >
                            {location.name}
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLocation(location.id, location.name);
                            }}
                            disabled={deleteLocation.isPending}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Minus className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <ClickableLabel 
                htmlFor="shelf_life_days" 
                enabled={fieldConfig.shelfLife}
                onClick={() => setFieldConfig({ ...fieldConfig, shelfLife: !fieldConfig.shelfLife })}
              >
                Expiration Period
              </ClickableLabel>
              {fieldConfig.shelfLife && (
                <div className="relative">
                  <Input
                    id="shelf_life_days"
                    type="number"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    day(s)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Recipe Yield (optional)</Label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
              <Input
                id="recipe_yield_quantity"
                type="number"
                step="0.01"
                placeholder="1"
                value={formData.recipe_yield_quantity}
                onChange={(e) => setFormData({ ...formData, recipe_yield_quantity: e.target.value })}
              />
              <Select
                value={formData.recipe_yield_unit_id || formData.unit_id || ''}
                onValueChange={(value) => setFormData({ ...formData, recipe_yield_unit_id: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50 max-h-56 overflow-auto">
                  {units?.map((availableUnit) => (
                    <SelectItem key={availableUnit.id} value={availableUnit.id}>
                      {availableUnit.name} ({availableUnit.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Used to calculate cost per finished item when linking recipes.
            </p>
          </div>

          <div>
            <ClickableLabel 
              htmlFor="stock_levels" 
              enabled={fieldConfig.stockLevels}
              onClick={() => setFieldConfig({ ...fieldConfig, stockLevels: !fieldConfig.stockLevels })}
            >
              Stock Levels
            </ClickableLabel>
            {fieldConfig.stockLevels && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_stock_level">Maximum Stock Level</Label>
                  <Input
                    id="max_stock_level" 
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {createItem.isPending || updateItem.isPending ? 'Saving...' : (editItem ? 'Update Item' : 'Add Item')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
