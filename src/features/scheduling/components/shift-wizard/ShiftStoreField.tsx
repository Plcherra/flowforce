import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { shouldAskForStore } from "@/features/stores/storeDraft";
import { useCompanyStores } from "@/features/stores/useCompanyStores";

export function ShiftStoreField(props: {
  location: string;
  storeId?: string;
  onChange: (next: { location: string; storeId: string }) => void;
}) {
  const { t } = useTranslation();
  const { stores } = useCompanyStores();

  useEffect(() => {
    if (stores.length !== 1) return;
    const only = stores[0];
    if (props.location === only.name && props.storeId === only.id) return;
    props.onChange({ location: only.name, storeId: only.id });
  }, [props, stores]);

  if (!shouldAskForStore(stores.length)) return null;

  return (
    <div className="space-y-1">
      <Label htmlFor="shift-store">{t("schedule.location")}</Label>
      <select
        id="shift-store"
        data-testid="shift-store"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={props.storeId ?? ""}
        onChange={(event) => {
          const store = stores.find((item) => item.id === event.target.value);
          if (!store) return;
          props.onChange({ location: store.name, storeId: store.id });
        }}
      >
        <option value="">{t("employees.chooseALocation")}</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}
