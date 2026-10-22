import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleQuickAction = (action: string) => {
    toast({
      title: `${action} Started`,
      description: `${action} dialog would open here`,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        className="bg-primary text-primary-foreground"
        onClick={() => handleQuickAction("Count Now")}
      >
        {t("inventory.countNow")} </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction("Receive")}
      >
        {t("inventory.receive")} </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction("Log Waste")}
      >
        {t("inventory.logWaste")} </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction("Prep Today")}
      >
        {t("inventory.prepToday")} </Button>
    </div>
  );
}
