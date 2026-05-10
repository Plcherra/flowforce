import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export function AvailabilityToggle() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // Load initial flag from auth user_metadata if present
    (async () => {
      const { data } = await supabase.auth.getUser();
      const flag = (data.user?.user_metadata as any)?.availability;
      if (typeof flag === "boolean") setAvailable(flag);
    })();
  }, []);
  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-auto bg-card border rounded-lg p-3 flex items-center justify-between shadow-sm">
      <div className="text-sm">
        <div className="font-medium">Available to Help</div>
        <div className="text-xs text-muted-foreground">
          Show as available to pick up Help Desk tickets
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="available">{available ? "On" : "Off"}</Label>
        <Switch
          id="available"
          checked={available}
          onCheckedChange={async (v) => {
            setAvailable(!!v);
            // Persist to auth metadata
            await supabase.auth.updateUser({ data: { availability: !!v } });
          }}
        />
      </div>
    </div>
  );
}
