import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { LowStockItem } from "@/features/inventory/hooks/useInventoryDashboard";

interface LowStockAlertProps {
  items: LowStockItem[];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Low Stock Items
        </CardTitle>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No items below minimum stock level
          </p>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 4).map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current: {item.current} {item.unit} | Min: {item.min}{" "}
                    {item.unit}
                  </p>
                </div>
                <Badge variant="destructive">Low</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
