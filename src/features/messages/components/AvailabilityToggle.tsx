import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function AvailabilityToggle() {
  const { t } = useTranslation();
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
    <div className="above-bottom-icon-nav fixed right-4 left-4 flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm md:left-auto md:w-auto">
      <div className="text-sm">
        <div className="font-medium">{t("messages.availableToHelp")}</div>
        <div className="text-xs text-muted-foreground">
          {t("messages.showAsAvailableToPickUpHelpDeskTickets")} </div>
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
