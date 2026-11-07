import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FormDistributionEditor } from "@/features/forms/components/FormDistributionEditor";
import type { FormDistribution } from "@/features/forms/utils/formDistribution";
import { shouldAskForStore } from "@/features/stores/storeDraft";
import { useCompanyStores } from "@/features/stores/useCompanyStores";

type Choice = { id: string; label: string };

export function FormWhoWhenStep({
  distribution,
  roles,
  people,
  positions,
  departments,
  onChange,
}: {
  distribution: FormDistribution;
  roles: Choice[];
  people: Choice[];
  positions: Choice[];
  departments: Choice[];
  onChange: (distribution: FormDistribution) => void;
}) {
  const { t } = useTranslation();
  const { stores } = useCompanyStores();
  useEffect(() => {
    if (stores.length !== 1) return;
    const only = stores[0]?.id;
    if (!only || distribution.storeIds?.[0] === only && (distribution.storeIds?.length ?? 0) === 1) return;
    onChange({ ...distribution, storeIds: [only] });
  }, [distribution, onChange, stores]);
  return (
    <section className="mx-auto w-full max-w-xl space-y-5" data-testid="form-builder-step-who">
      <h2 className="text-xl font-semibold">{t("forms.builderWho")}</h2>
      <FormDistributionEditor
        distribution={distribution}
        roles={roles}
        people={people}
        positions={positions}
        departments={departments}
        stores={shouldAskForStore(stores.length) ? stores.map((store) => ({ id: store.id, label: store.name })) : []}
        onChange={onChange}
      />
    </section>
  );
}
