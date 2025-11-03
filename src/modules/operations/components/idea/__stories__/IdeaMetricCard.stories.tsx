import IdeaMetricCard from '../IdeaMetricCard';

const meta = {
  title: 'Operations/IDEA/MetricCard',
  component: IdeaMetricCard,
};

export default meta;

export const DefaultMetricCard = () => (
  <div className="max-w-sm">
    <IdeaMetricCard
      title="Net Sales"
      value={152430}
      delta={12.5}
      unit="USD"
      description="Sales volume over the last IDEA cycle."
    />
  </div>
);
