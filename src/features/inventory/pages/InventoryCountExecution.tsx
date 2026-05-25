import { useNavigate, useParams } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, Settings } from "lucide-react";
import { EnhancedCountingTable } from "@/features/inventory/components/EnhancedCountingTable";

export default function InventoryCountExecution() {
  const { countId: rawCountId } = useParams<{ countId?: string | string[] }>();
  const navigate = useNavigate();
  const countId = Array.isArray(rawCountId) ? rawCountId[0] : rawCountId;

  if (!countId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Count not found</h1>
          <Button
            onClick={() => navigate("/app/inventory/counts")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Counts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/inventory/counts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Counts
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Calculator className="h-8 w-8" />
                Enhanced Inventory Count Execution
              </h1>
              <p className="text-muted-foreground">
                MarketMan-style counting interface with multi-unit support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Count Settings
            </Button>
          </div>
        </div>

        {/* Enhanced Counting Table */}
        <EnhancedCountingTable
          countId={countId}
          onCountUpdate={(_counts) => {
            // Handle count updates - could refresh data or show toast
          }}
        />

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 p-4 bg-muted/20 rounded-lg">
          <div className="text-sm text-muted-foreground">
            Auto-save enabled • Last saved: Just now
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Export Count Sheet</Button>
            <Button variant="outline">Save Progress</Button>
            <Button>Complete Count</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
