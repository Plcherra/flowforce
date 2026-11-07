import { useTranslation } from "react-i18next";
import { FormDistributionEditor } from "@/features/forms/components/FormDistributionEditor";
import type { FormDistribution } from "@/features/forms/utils/formDistribution";

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
  return (
    <section className="mx-auto w-full max-w-xl space-y-5" data-testid="form-builder-step-who">
      <h2 className="text-xl font-semibold">{t("forms.builderWho")}</h2>
      <FormDistributionEditor
        distribution={distribution}
        roles={roles}
        people={people}
        positions={positions}
        departments={departments}
        onChange={onChange}
      />
    </section>
  );
}
