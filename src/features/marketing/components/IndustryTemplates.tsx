import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, ArrowRight } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { useTranslation } from "react-i18next";

export function IndustryTemplates() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const features = [
    "landing.coffee.featureOpen",
    "landing.coffee.featureShift",
    "landing.coffee.featureClose",
  ] as const;

  return (
    <section className="bg-gradient-to-br from-muted to-primary/10 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="mb-6 text-4xl font-bold text-foreground lg:text-5xl">
            {t("landing.industries.title")}
          </h2>
          <p className="text-xl text-muted-foreground">{t("landing.industries.subtitle")}</p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardContent className="space-y-6 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary">
              <Coffee className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{t("landing.coffee.title")}</h3>
            <p className="leading-relaxed text-muted-foreground">{t("landing.coffee.description")}</p>
            <ul className="space-y-2">
              {features.map((key) => (
                <li key={key} className="text-sm text-muted-foreground">
                  {t(key)}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="min-h-11 w-full"
              onClick={() => navigate("/company-registration")}
            >
              {t("landing.coffee.start")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
