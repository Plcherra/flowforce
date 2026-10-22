import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { LowStockItem } from "@/features/inventory/hooks/useInventoryDashboard";

interface LowStockAlertProps {
  items: LowStockItem[];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {t("inventory.lowStockItems")} </CardTitle>
        <Button variant="outline" size="sm">
          {t("inventory.viewAll")} </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {t("inventory.noItemsBelowMinimumStockLevel")} </p>
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
                    {t("inventory.current")} {item.current} {item.unit} {t("inventory.min")} {item.min}{" "}
                    {item.unit}
                  </p>
                </div>
                <Badge variant="destructive">{t("tasks.low")}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
