import { Button } from "@/components/ui/button";
import { Building2, Play, ArrowRight } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { DemoModal } from "@/features/marketing/components/DemoModal";
import { useTranslation } from "react-i18next";

export function HeroSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-8 inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-primary">
            <span className="mr-2 h-2 w-2 rounded-full bg-primary"></span>
            {t("landing.model.eyebrow")}
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight text-foreground lg:text-7xl">
            {t("landing.operationsMade")}
            <span className="block text-primary">{t("landing.simple")}</span>
          </h1>

          <p className="mb-8 text-xl leading-relaxed text-muted-foreground lg:text-2xl">
            {t("landing.subtitle")}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              className="px-8 py-4 text-lg font-semibold"
              onClick={() => navigate("/company-registration")}
            >
              <Building2 className="mr-2 h-5 w-5" />
              {t("landing.registerCompany")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <DemoModal>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg font-semibold"
              >
                <Play className="mr-2 h-5 w-5" />
                {t("landing.watchDemo")}
              </Button>
            </DemoModal>
          </div>
        </div>
      </div>
    </section>
  );
}
