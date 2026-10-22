import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Mail,
  Twitter,
  Linkedin,
  Youtube,
  Github,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router-adapter";
import { useTranslation } from "react-i18next";

export function LandingFooter() {
  const [email, setEmail] = useState("");
  const { t } = useTranslation();

  const handleNewsletterSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    setEmail("");
  };

  return (
    <footer className="bg-foreground text-primary-foreground">
      {/* Newsletter Section */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">
              {t("footer.stayUpdated")}
            </h3>
            <p className="text-muted-foreground mb-8">{t("footer.newsletterText")}</p>
            <form
              onSubmit={handleNewsletterSignup}
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder={t("footer.enterEmail")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-foreground border-border text-primary-foreground placeholder-muted-foreground focus:border-primary"
              />
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 whitespace-nowrap"
              >
                <Mail className="mr-2 h-4 w-4" />
                {t("footer.subscribe")}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">FlowForce</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t("landing.subtitle")}
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.product")}</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  {t("landing.features")}
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  {t("landing.pricing")}
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Templates
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Integrations
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Press
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.support")}</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-primary-foreground transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Legal Links */}
            <div className="flex items-center space-x-6 text-muted-foreground text-sm">
              <span>{t("footer.allRightsReserved")}</span>
              <Link to="#" className="hover:text-primary-foreground transition-colors">
                {t("footer.privacyPolicy")}
              </Link>
              <Link to="#" className="hover:text-primary-foreground transition-colors">
                {t("footer.termsOfService")}
              </Link>
              <Link to="#" className="hover:text-primary-foreground transition-colors">
                {t("footer.cookiePolicy")}
              </Link>
            </div>

            {/* Social Links - external links use <a> */}
            <div className="flex items-center space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary-foreground transition-colors"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
