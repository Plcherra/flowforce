import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink, CheckCircle, ArrowRight } from "lucide-react";
import { IntegrationStep } from "./IntegrationStep";

interface Integration {
  name: string;
  description: string;
  difficulty: string;
  time: string;
  icon: React.ReactNode;
  steps: string[];
  requirements: string[];
  benefits: string[];
}

interface IntegrationCardProps {
  integration: Integration;
  onStartIntegration: (name: string) => void;
}

export function IntegrationCard({
  integration,
  onStartIntegration,
}: IntegrationCardProps) {
  const { t } = useTranslation();
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-muted">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          {integration.icon}
          <div className="ml-3">
            <h4 className="text-xl font-semibold text-foreground">
              {integration.name}
            </h4>
            <p className="text-muted-foreground mt-1">{integration.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={
              integration.difficulty === "Easy"
                ? "default"
                : integration.difficulty === "Medium"
                  ? "secondary"
                  : "destructive"
            }
          >
            {integration.difficulty}
          </Badge>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            {integration.time}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2">
          <h5 className="font-semibold text-foreground mb-3">
            {t("resources.stepByStepGuide")}
          </h5>
          <div className="space-y-3">
            {integration.steps.map((step, stepIndex) => (
              <IntegrationStep key={stepIndex} step={step} index={stepIndex} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h5 className="font-semibold text-foreground mb-2">{t("certifications.requirements")}</h5>
            <ul className="space-y-1">
              {integration.requirements.map((req, reqIndex) => (
                <li
                  key={reqIndex}
                  className="flex items-center text-sm text-muted-foreground"
                >
                  <CheckCircle className="h-4 w-4 text-success mr-2 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-foreground mb-2">{t("resources.benefits")}</h5>
            <ul className="space-y-1">
              {integration.benefits.map((benefit, benefitIndex) => (
                <li
                  key={benefitIndex}
                  className="flex items-center text-sm text-muted-foreground"
                >
                  <ArrowRight className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <button
          onClick={() => onStartIntegration(integration.name)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center text-sm"
        >
          {t("resources.startIntegration")}
          <ExternalLink className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
