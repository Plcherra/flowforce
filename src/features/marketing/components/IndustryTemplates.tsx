import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, UtensilsCrossed, Heart, ArrowRight } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { useTranslation } from "react-i18next";

const industries = [
  {
    icon: Store,
    titleKey: "landing.industries.retail.title",
    descriptionKey: "landing.industries.retail.description",
    featuresKeys: [
      "landing.industries.retail.features.alerts",
      "landing.industries.retail.features.tracking",
      "landing.industries.retail.features.automation",
    ],
    color: "text-primary",
    bgColor: "bg-primary",
    gradient: "from-primary to-primary",
  },
  {
    icon: UtensilsCrossed,
    titleKey: "landing.industries.hospitality.title",
    descriptionKey: "landing.industries.hospitality.description",
    featuresKeys: [
      "landing.industries.hospitality.features.kitchen",
      "landing.industries.hospitality.features.scheduling",
      "landing.industries.hospitality.features.feedback",
    ],
    color: "text-warning",
    bgColor: "bg-warning",
    gradient: "from-warning to-destructive",
  },
  {
    icon: Heart,
    titleKey: "landing.industries.healthcare.title",
    descriptionKey: "landing.industries.healthcare.description",
    featuresKeys: [
      "landing.industries.healthcare.features.compliance",
      "landing.industries.healthcare.features.tracking",
      "landing.industries.healthcare.features.alerts",
    ],
    color: "text-success",
    bgColor: "bg-success",
    gradient: "from-success to-success",
  },
];

export function IndustryTemplates() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-gradient-to-br from-muted to-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {t("landing.industries.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("landing.industries.subtitle")}
          </p>
        </div>

        {/* Industry Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {industries.map((industry, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-4"
            >
              {/* Background Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${industry.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
              ></div>

              <CardContent className="p-8 relative">
                {/* Icon */}
                <div
                  className={`w-20 h-20 bg-gradient-to-br ${industry.gradient} rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}
                >
                  <industry.icon className="h-10 w-10 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {t(industry.titleKey)}
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t(industry.descriptionKey)}
                </p>

                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  {industry.featuresKeys.map((featureKey, idx) => (
                    <li
                      key={idx}
                      className="flex items-center text-sm text-muted-foreground"
                    >
                      <div
                        className={`w-2 h-2 ${industry.bgColor} rounded-full mr-3`}
                      ></div>
                      {t(featureKey)}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant="outline"
                  className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground group/btn transition-all duration-300"
                  onClick={() =>
                    navigate(`/templates/${t(industry.titleKey).toLowerCase()}`)
                  }
                >
                  {t("landing.industries.explore")} {t(industry.titleKey)}{" "}
                  {t("landing.industries.template")}
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
