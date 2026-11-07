import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Link, useNavigate } from "@/lib/router-adapter";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "react-i18next";

export function LandingHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Building2 className="h-8 w-8 text-primary" />
          </div>

          {/* Navigation - Hidden on mobile, can be expanded later */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/features"
              className="font-medium text-foreground hover:text-primary"
            >
              {t("landing.features")}
            </Link>
            <Link
              to="/templates"
              className="font-medium text-foreground hover:text-primary"
            >
              {t("landing.templatesNav")}
            </Link>
            <Link
              to="/pricing"
              className="font-medium text-foreground hover:text-primary"
            >
              {t("landing.pricing")}
            </Link>
            <Link
              to="/resources"
              className="font-medium text-foreground hover:text-primary"
            >
              {t("landing.resources")}
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              {t("common.signIn")}
            </Button>
            <Button onClick={() => navigate("/register")}>
              {t("landing.startFreeTrial")}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
