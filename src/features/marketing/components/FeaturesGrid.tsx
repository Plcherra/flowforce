import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  FileText,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { EmployeeManagement } from "@/features/marketing/components/illustrations/EmployeeManagement";
import { ShiftScheduling } from "@/features/marketing/components/illustrations/ShiftScheduling";
import { TaskManagement } from "@/features/marketing/components/illustrations/TaskManagement";
import { InternalCommunication } from "@/features/marketing/components/illustrations/InternalCommunication";
import { DigitalForms } from "@/features/marketing/components/illustrations/DigitalForms";
import { AnalyticsReporting } from "@/features/marketing/components/illustrations/AnalyticsReporting";
import { useTranslation } from "react-i18next";

const features = [
  {
    icon: Users,
    titleKey: "features.employeeManagement.title",
    descriptionKey: "features.employeeManagement.description",
    color: "text-primary",
    bgColor: "bg-primary/10",
    anchor: "employee-management",
    illustration: EmployeeManagement,
  },
  {
    icon: Calendar,
    titleKey: "features.shiftScheduling.title",
    descriptionKey: "features.shiftScheduling.description",
    color: "text-success",
    bgColor: "bg-success-muted",
    anchor: "shift-scheduling",
    illustration: ShiftScheduling,
  },
  {
    icon: CheckSquare,
    titleKey: "features.taskManagement.title",
    descriptionKey: "features.taskManagement.description",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    anchor: "task-management",
    illustration: TaskManagement,
  },
  {
    icon: MessageSquare,
    titleKey: "features.internalCommunication.title",
    descriptionKey: "features.internalCommunication.description",
    color: "text-accent",
    bgColor: "bg-accent/60",
    anchor: "internal-communication",
    illustration: InternalCommunication,
  },
  {
    icon: FileText,
    titleKey: "features.digitalForms.title",
    descriptionKey: "features.digitalForms.description",
    color: "text-warning",
    bgColor: "bg-warning-muted",
    anchor: "digital-forms",
    illustration: DigitalForms,
  },
  {
    icon: BarChart3,
    titleKey: "features.analyticsReporting.title",
    descriptionKey: "features.analyticsReporting.description",
    color: "text-primary",
    bgColor: "bg-primary/10",
    anchor: "analytics-reporting",
    illustration: AnalyticsReporting,
  },
];

export function FeaturesGrid() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {t("landing.everythingNeeds")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("landing.sixModules")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className="h-48 mb-4">
                  <feature.illustration />
                </div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {t(feature.titleKey)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-muted-foreground mb-6 leading-relaxed">
                  {t(feature.descriptionKey)}
                </CardDescription>
                <Button
                  variant="ghost"
                  className="text-primary hover:text-primary hover:bg-primary/5 p-0 h-auto font-semibold group/btn"
                  onClick={() => navigate(`/features#${feature.anchor}`)}
                >
                  {t("landing.learnMore")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
