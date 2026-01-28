import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function LandingHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-md border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Building2 className="h-8 w-8 text-white" />
          </div>

          {/* Navigation - Hidden on mobile, can be expanded later */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/features"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {t("landing.features")}
            </Link>
            <Link
              to="/templates"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {t("landing.templatesNav")}
            </Link>
            <Link
              to="/pricing"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {t("landing.pricing")}
            </Link>
            <Link
              to="/resources"
              className="text-muted-foreground hover:text-primary transition-colors font-medium"
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
