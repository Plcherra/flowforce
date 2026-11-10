import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STORE_DAYS,
  blankStore,
  type StoreDraft,
  type StoreDay,
} from "@/features/stores/storeDraft";

export function StoreStep(props: {
  stores: StoreDraft[];
  onChange: (stores: StoreDraft[]) => void;
  readOnly?: boolean;
}) {
  const readOnly = props.readOnly === true;
  const { t } = useTranslation();
  const update = (key: string, patch: (store: StoreDraft) => StoreDraft) => {
    props.onChange(props.stores.map((store) => (store.key === key ? patch(store) : store)));
  };

  return (
    <div className="space-y-6" data-testid="signup-stores">
      {props.stores.map((store, index) => (
        <section key={store.key} className="space-y-4 rounded-md border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`store-name-${store.key}`}>{t("onboarding.account.store.name")}</Label>
              <Input
                id={`store-name-${store.key}`}
                data-testid={index === 0 ? "store-name" : `store-name-${index}`}
                value={store.name}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(event) =>
                  update(store.key, (current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`store-address-${store.key}`}>
                {t("onboarding.account.store.address")}
              </Label>
              <Input
                id={`store-address-${store.key}`}
                data-testid={index === 0 ? "store-address" : `store-address-${index}`}
                value={store.address}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(event) =>
                  update(store.key, (current) => ({ ...current, address: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("onboarding.account.store.hours")}</p>
            {STORE_DAYS.map((day) => (
              <DayRow
                key={day}
                day={day}
                storeKey={store.key}
                readOnly={readOnly}
                closed={store.hours[day].closed}
                open={store.hours[day].open}
                close={store.hours[day].close}
                onClosed={(closed) =>
                  update(store.key, (current) => ({
                    ...current,
                    hours: { ...current.hours, [day]: { ...current.hours[day], closed } },
                  }))
                }
                onOpen={(open) =>
                  update(store.key, (current) => ({
                    ...current,
                    hours: { ...current.hours, [day]: { ...current.hours[day], open } },
                  }))
                }
                onClose={(close) =>
                  update(store.key, (current) => ({
                    ...current,
                    hours: { ...current.hours, [day]: { ...current.hours[day], close } },
                  }))
                }
              />
            ))}
          </div>
          {!readOnly && props.stores.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              data-testid={`store-remove-${index}`}
              onClick={() => props.onChange(props.stores.filter((item) => item.key !== store.key))}
            >
              {t("onboarding.account.store.remove")}
            </Button>
          ) : null}
        </section>
      ))}
      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          data-testid="store-add"
          onClick={() => props.onChange([...props.stores, blankStore()])}
        >
          {t("onboarding.account.store.add")}
        </Button>
      ) : null}
    </div>
  );
}

function DayRow(props: {
  day: StoreDay;
  storeKey: string;
  readOnly?: boolean;
  closed: boolean;
  open: string;
  close: string;
  onClosed: (closed: boolean) => void;
  onOpen: (value: string) => void;
  onClose: (value: string) => void;
}) {
  const readOnly = props.readOnly === true;
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-[7rem_auto_1fr_1fr] items-center gap-2">
      <span className="text-sm">{t(`schedule.day${dayKey(props.day)}`)}</span>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid={`store-closed-${props.day}`}
          checked={props.closed}
          disabled={readOnly}
          onChange={(event) => props.onClosed(event.target.checked)}
        />
        {t("onboarding.account.store.closed")}
      </label>
      <Input
        type="time"
        aria-label={t("onboarding.account.store.opens")}
        data-testid={`store-open-${props.day}`}
        value={props.open}
        disabled={readOnly || props.closed}
        onChange={(event) => props.onOpen(event.target.value)}
      />
      <Input
        type="time"
        aria-label={t("onboarding.account.store.closes")}
        data-testid={`store-close-${props.day}`}
        value={props.close}
        disabled={readOnly || props.closed}
        onChange={(event) => props.onClose(event.target.value)}
      />
    </div>
  );
}

function dayKey(day: StoreDay): string {
  const labels: Record<StoreDay, string> = {
    monday: "MonShort",
    tuesday: "TueShort",
    wednesday: "WedShort",
    thursday: "ThuShort",
    friday: "FriShort",
    saturday: "SatShort",
    sunday: "SunShort",
  };
  return labels[day];
}
