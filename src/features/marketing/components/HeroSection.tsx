import { Button } from "@/components/ui/button";
import { Building2, Play, ArrowRight } from "lucide-react";
import { useNavigate } from "@/lib/router-adapter";
import { DemoModal } from "@/features/marketing/components/DemoModal";
import { useTranslation } from "react-i18next";

export function HeroSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-muted to-primary/10 flex items-center overflow-hidden">
      {/* Background Video Overlay */}
      <div className="absolute inset-0 bg-foreground/10">
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent"></div>
        {/* Placeholder for product screencast - in real implementation, this would be a video */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/20 animate-pulse"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
            {t("landing.usedBy")}
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-fade-in">
            {t("landing.operationsMade")}
            <span className="text-primary block">{t("landing.simple")}</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl lg:text-2xl text-muted-foreground mb-8 leading-relaxed animate-fade-in">
            {t("landing.subtitle")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold group transition-all duration-300 hover:scale-105"
              onClick={() => navigate("/company-registration")}
            >
              <Building2 className="mr-2 h-5 w-5" />
              {t("landing.registerCompany")}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>

            <DemoModal>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg font-semibold group transition-all duration-300"
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                {t("landing.watchDemo")}
              </Button>
            </DemoModal>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-border animate-fade-in">
            <div>
              <div className="text-2xl font-bold text-foreground">20%</div>
              <div className="text-sm text-muted-foreground">
                {t("landing.fasterScheduling")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{t("landing.n15min")}</div>
              <div className="text-sm text-muted-foreground">
                {t("landing.averageSetup")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">99.9%</div>
              <div className="text-sm text-muted-foreground">
                {t("landing.uptimeGuarantee")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
