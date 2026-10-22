
interface IntegrationStepProps {
  step: string;
  index: number;
}

export function IntegrationStep({ step, index }: IntegrationStepProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
        <span className="text-xs font-medium text-primary">{index + 1}</span>
      </div>
      <p className="text-foreground text-sm">{step}</p>
    </div>
  );
}
