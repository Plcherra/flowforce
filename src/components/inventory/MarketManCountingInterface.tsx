import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useInventoryItems, useInventoryCategories, useInventoryLocations, useInventoryCountLines, useInventoryCounts } from '@/hooks/useInventory';
import { useCountingTimer } from '@/hooks/inventory/useCountingTimer';
import { useCountingStats, CountData } from '@/hooks/inventory/useCountingStats';
import { CountingTimers } from './counting/CountingTimers';
import { CountingFilters } from './counting/CountingFilters';
import { CountingTable } from './counting/CountingTable';
import { CountingStats } from './counting/CountingStats';

interface MarketManCountingInterfaceProps {
  countId: string;
  onCountUpdate?: () => void;
}

export function MarketManCountingInterface({ countId, onCountUpdate }: MarketManCountingInterfaceProps) {
  const { toast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showUncountedOnly, setShowUncountedOnly] = useState(false);
  const [counts, setCounts] = useState<Record<string, CountData>>({});
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCountCompleted, setIsCountCompleted] = useState(false);
  const [countingStats, setCountingStats] = useState<any>(null);
  const [editStats, setEditStats] = useState<any>(null);

  // Custom hooks
  const { data: allItems = [], isLoading: itemsLoading } = useInventoryItems();
  const { data: categories = [] } = useInventoryCategories();
  const { data: locations = [] } = useInventoryLocations();
  const { countLines } = useInventoryCountLines(countId);
  const { completeCount } = useInventoryCounts();
  
  const timer = useCountingTimer();
  const statsCalculator = useCountingStats(counts, allItems);

  // Initialize counts from count lines
  useEffect(() => {
    if (countLines && countLines.length > 0) {
      const initialCounts: Record<string, CountData> = {};
      const savedSet = new Set<string>();
      
      countLines.forEach(line => {
        if (line.counted_quantity !== null && line.counted_quantity !== undefined) {
          initialCounts[line.item_id] = {
            item_id: line.item_id,
            unit_counts: { [line.item_id]: line.counted_quantity }
          };
          if (line.counted_at) {
            savedSet.add(line.item_id);
          }
        }
      });
      
      setCounts(initialCounts);
      setSavedItems(savedSet);
    }
  }, [countLines]);

  // Filtered items
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesLocation = !selectedLocation || item.location?.name === selectedLocation;
    const matchesUncounted = !showUncountedOnly || !savedItems.has(item.id);
    
    return matchesSearch && matchesCategory && matchesLocation && matchesUncounted;
  });

  // Event handlers
  const updateCount = (itemId: string, unitId: string, quantity: number) => {
    if (isCountCompleted) return;
    
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        item_id: itemId,
        unit_counts: {
          ...prev[itemId]?.unit_counts,
          [unitId]: quantity
        }
      }
    }));
  };

  const saveItem = async (itemId: string) => {
    try {
      setSavedItems(prev => new Set([...prev, itemId]));
      toast({
        title: "Item Saved",
        description: "Count data has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save count data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteCount = async () => {
    try {
      timer.stopCountingTimer();
      const stats = timer.generateTimerStats(savedItems.size);
      setCountingStats(stats);
      setIsCountCompleted(true);
      
      await completeCount(countId);
      onCountUpdate?.();
      
      toast({
        title: "Count Completed",
        description: `Successfully completed count with ${savedItems.size} items.`,
      });
    } catch (error) {
      console.error('Error completing count:', error);
      toast({
        title: "Completion Failed",
        description: "Failed to complete count. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditMode = () => {
    if (isEditMode) {
      timer.stopEditTimer();
      const stats = timer.generateEditStats(savedItems.size);
      setEditStats(stats);
    } else {
      timer.startEditTimer();
    }
    setIsEditMode(!isEditMode);
  };

  if (itemsLoading) {
    return <div>Loading inventory items...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Timers */}
      <CountingTimers
        countingTime={timer.countingTime}
        editTime={timer.editTime}
        isTimerRunning={timer.isTimerRunning}
        isEditTimerRunning={timer.isEditTimerRunning}
        isEditMode={isEditMode}
        formatTime={timer.formatTime}
        onStartTimer={timer.startCountingTimer}
        onStopTimer={timer.stopCountingTimer}
        onStartEditTimer={timer.startEditTimer}
        onStopEditTimer={timer.stopEditTimer}
      />

      {/* Filters */}
      <CountingFilters
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        selectedLocation={selectedLocation}
        showUncountedOnly={showUncountedOnly}
        categories={categories}
        locations={locations}
        onSearchChange={setSearchTerm}
        onCategoryChange={setSelectedCategory}
        onLocationChange={setSelectedLocation}
        onUncountedOnlyChange={setShowUncountedOnly}
      />

      {/* Counting Table */}
      <CountingTable
        items={filteredItems}
        counts={counts}
        savedItems={savedItems}
        isCountCompleted={isCountCompleted}
        onUpdateCount={updateCount}
        onSaveItem={saveItem}
        calculateItemTotalPrice={statsCalculator.calculateItemTotalPrice}
        calculateVariance={statsCalculator.calculateVariance}
        getVarianceStatus={statsCalculator.getVarianceStatus}
      />

      {/* Statistics */}
      <CountingStats
        itemsCompleted={savedItems.size}
        itemsCounted={statsCalculator.stats.itemsCounted}
        itemsRemaining={filteredItems.length - savedItems.size}
        totalAmount={statsCalculator.stats.totalValue}
        significantVariances={statsCalculator.stats.significantVariances}
        countingStats={countingStats}
        editStats={editStats}
        formatTime={timer.formatTime}
      />

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {/* Complete Count Button */}
        {!isCountCompleted && !isEditMode && savedItems.size > 0 && (
          <Button
            onClick={handleCompleteCount}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete Count
          </Button>
        )}

        {/* Edit Mode Toggle */}
        {isCountCompleted && (
          <Button
            onClick={handleEditMode}
            variant="outline"
            size="lg"
          >
            {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </Button>
        )}
      </div>
    </div>
  );
}