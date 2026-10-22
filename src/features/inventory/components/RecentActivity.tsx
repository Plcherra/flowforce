import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RecentActivity as RecentActivityType } from "@/features/inventory/hooks/useInventoryDashboard";

interface RecentActivityProps {
  activities: RecentActivityType[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("tasks.recentActivity")}</CardTitle>
        <Button variant="outline" size="sm">
          {t("inventory.viewAll")} </Button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {t("tasks.noRecentActivity")} </p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 4).map((activity, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.item}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
