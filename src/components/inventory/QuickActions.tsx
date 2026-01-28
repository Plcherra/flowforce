import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
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
        Count Now
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction("Receive")}
      >
        Receive
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction("Log Waste")}
      >
        Log Waste
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction("Prep Today")}
      >
        Prep Today
      </Button>
    </div>
  );
}
