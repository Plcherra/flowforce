import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calculator, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NewCountWizard } from '@/components/inventory/NewCountWizard';
import { CountManagement } from '@/components/inventory/CountManagement';
import { InventoryLayout } from '../components/InventoryLayout';
import { IfCan } from '@/components/permissions/IfCan';

export default function InventoryCountsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleViewCount = (countId: string) => {
    navigate(`/inventory/counts/${countId}`);
  };

  return (
    <InventoryLayout>
      <IfCan permission="inventory.counts.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Calculator className="h-8 w-8" />
                Inventory Counts
              </h1>
              <p className="text-muted-foreground">
                Physical inventory counts and reconciliation
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">Import Count</Button>
              <Button onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Count
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Count List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Recent Counts</h2>
              <CountManagement 
                onViewCount={handleViewCount}
              />
            </div>
          </div>

          <NewCountWizard open={showWizard} onOpenChange={setShowWizard} />
        </div>
      </IfCan>
    </InventoryLayout>
  );
}