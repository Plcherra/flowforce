import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ClipboardList, Package, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const packs = [
  {
    id: "ops",
    icon: ClipboardList,
    titleKey: "landing.model.ops.title",
    badgeKey: "landing.model.ops.badge",
    descriptionKey: "landing.model.ops.description",
  },
  {
    id: "team",
    icon: Users,
    titleKey: "landing.model.team.title",
    badgeKey: "landing.model.team.badge",
    descriptionKey: "landing.model.team.description",
  },
  {
    id: "insights",
    icon: BarChart3,
    titleKey: "landing.model.insights.title",
    badgeKey: "landing.model.insights.badge",
    descriptionKey: "landing.model.insights.description",
  },
  {
    id: "stock",
    icon: Package,
    titleKey: "landing.model.stock.title",
    badgeKey: "landing.model.stock.badge",
    descriptionKey: "landing.model.stock.description",
  },
] as const;

export function FeaturesGrid() {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-24" id="packs" data-testid="landing-pack-model">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold text-foreground lg:text-5xl">
            {t("landing.model.title")}
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
            {t("landing.model.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {packs.map((pack) => (
            <Card key={pack.id} data-testid={`landing-pack-${pack.id}`}>
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                    <pack.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant={pack.id === "ops" ? "default" : "outline"}>
                    {t(pack.badgeKey)}
                  </Badge>
                </div>
                <CardTitle>{t(pack.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {t(pack.descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("landing.model.priceNote")}
        </p>
      </div>
    </section>
  );
}
