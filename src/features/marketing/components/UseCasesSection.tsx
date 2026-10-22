import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  CheckCircle,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const useCases = [
  {
    icon: TrendingUp,
    metric: "20%",
    titleKey: "landing.useCases.fasterScheduling.title",
    descriptionKey: "landing.useCases.fasterScheduling.description",
    color: "text-success",
    bgColor: "bg-success-muted",
  },
  {
    icon: Clock,
    metric: "15hrs",
    titleKey: "landing.useCases.timeSaved.title",
    descriptionKey: "landing.useCases.timeSaved.description",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    metric: "1,200+",
    titleKey: "landing.useCases.locationsManaged.title",
    descriptionKey: "landing.useCases.locationsManaged.description",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: DollarSign,
    metric: "35%",
    titleKey: "landing.useCases.costReduction.title",
    descriptionKey: "landing.useCases.costReduction.description",
    color: "text-accent",
    bgColor: "bg-accent/60",
  },
  {
    icon: CheckCircle,
    metric: "99.9%",
    titleKey: "landing.useCases.taskCompletion.title",
    descriptionKey: "landing.useCases.taskCompletion.description",
    color: "text-success",
    bgColor: "bg-success-muted",
  },
  {
    icon: Zap,
    metric: "2min",
    titleKey: "landing.useCases.averageResponse.title",
    descriptionKey: "landing.useCases.averageResponse.description",
    color: "text-warning",
    bgColor: "bg-warning-muted",
  },
];

export function UseCasesSection() {
  const { t } = useTranslation();
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="text-primary border-primary mb-4"
          >
            {t("landing.useCases.badge")}
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {t("landing.useCases.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("landing.useCases.subtitle")}
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <Card
              key={index}
              className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <CardContent className="p-8">
                {/* Icon */}
                <div
                  className={`w-16 h-16 ${useCase.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <useCase.icon className={`h-8 w-8 ${useCase.color}`} />
                </div>

                {/* Metric */}
                <div className="mb-4">
                  <div className={`text-4xl font-bold ${useCase.color} mb-2`}>
                    {useCase.metric}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t(useCase.titleKey)}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {t(useCase.descriptionKey)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Stats Bar */}
        <div className="mt-16 p-8 bg-gradient-to-r from-primary to-primary rounded-2xl text-primary-foreground">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">50,000+</div>
              <div className="text-primary-foreground">
                {t("landing.useCases.stats.employeesManaged")}
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">{t("landing.n12m")}</div>
              <div className="text-primary-foreground">
                {t("landing.useCases.stats.tasksCompleted")}
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">98%</div>
              <div className="text-primary-foreground">
                {t("landing.useCases.stats.customerSatisfaction")}
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-primary-foreground">
                {t("landing.useCases.stats.supportAvailable")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
