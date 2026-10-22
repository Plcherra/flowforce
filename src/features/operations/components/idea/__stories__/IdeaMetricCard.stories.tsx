import { useTranslation } from "react-i18next";
import IdeaMetricCard from "../IdeaMetricCard";

const meta = {
  title: "Operations/IDEA/MetricCard",
  component: IdeaMetricCard,
};

export default meta;

export const DefaultMetricCard = () => {
  const { t } = useTranslation();
  return (
  <div className="max-w-sm">
    <IdeaMetricCard
      title={t("operations.netSales")}
      value={152430}
      delta={12.5}
      unit="USD"
      description="Sales volume over the last IDEA cycle."
    />
  </div>
);
};
