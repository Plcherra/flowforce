import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import {
  Utensils,
  Briefcase,
  ShoppingCart,
  Heart,
  Cog,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { BUSINESS_TEMPLATES } from "@/data/businessTemplates";
import { BusinessTemplate } from "@/types/templates";
import { useTranslation } from "react-i18next";
import { I18nHelpers } from "@/utils/i18nHelpers";

interface TemplateSelectorProps {
  onTemplateSelect: (template: BusinessTemplate) => void;
  selectedTemplate?: string;
}

const TEMPLATE_ICONS = {
  Utensils,
  Briefcase,
  ShoppingCart,
  Heart,
  Cog,
};

const INITIAL_LOAD_COUNT = 4;

export default function TemplateSelector({
  onTemplateSelect,
  selectedTemplate,
}: TemplateSelectorProps) {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] =
    useState(selectedTemplate);
  const [visibleTemplates, setVisibleTemplates] = useState(INITIAL_LOAD_COUNT);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleTemplateClick = (template: BusinessTemplate) => {
    setSelectedTemplateId(template.id);
    onTemplateSelect(template);
  };

  const getSectionName = (sectionId: string) => {
    // Use I18nHelpers for localized section names
    return I18nHelpers.getLocalizedSection(sectionId).name;
  };

  const getLocalizedTemplate = (template: BusinessTemplate) => {
    // Use I18nHelpers for localized template content
    return I18nHelpers.getLocalizedTemplate(template.id, template);
  };

  const loadMoreTemplates = useCallback(() => {
    if (visibleTemplates >= BUSINESS_TEMPLATES.length) return;

    setIsLoading(true);
    setTimeout(() => {
      setVisibleTemplates((prev) =>
        Math.min(prev + 4, BUSINESS_TEMPLATES.length),
      );
      setIsLoading(false);
    }, 300);
  }, [visibleTemplates]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          visibleTemplates < BUSINESS_TEMPLATES.length
        ) {
          loadMoreTemplates();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreTemplates, visibleTemplates]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Choose Your Business Template
        </h3>
        <p className="text-muted-foreground">
          Select a pre-configured template that matches your business type. You
          can customize sections later.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Custom Template Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          whileHover={{
            y: -4,
            transition: { duration: 0.2 },
          }}
          className="group"
        >
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-secondary/40 ${
              selectedTemplateId === "custom"
                ? "border-secondary/40 bg-secondary/10 shadow-md ring-2 ring-secondary/40"
                : "border-border hover:bg-muted"
            }`}
            onClick={() =>
              handleTemplateClick({
                id: "custom",
                name: t("onboarding.customTemplate.title"),
                description: t("onboarding.customTemplate.description"),
                industry: "Custom",
                icon: "Cog",
                sections: [],
                defaultRoles: [],
              })
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <motion.div
                    className={`p-2 rounded-lg transition-colors ${
                      selectedTemplateId === "custom"
                        ? "bg-secondary text-primary-foreground"
                        : "bg-muted group-hover:bg-secondary/20"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Cog className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <CardTitle className="text-lg">
                      {t("onboarding.customTemplate.title")}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="mt-1 bg-secondary/10 text-secondary"
                    >
                      {t("common.custom")}
                    </Badge>
                  </div>
                </div>
                {selectedTemplateId === "custom" && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckCircle className="h-5 w-5 text-secondary" />
                  </motion.div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {t("onboarding.customTemplate.description")}
              </CardDescription>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• {t("common.customBranding")}</p>
                <p>• {t("common.flexibleSections")}</p>
                <p>• {t("common.uniqueLayouts")}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {BUSINESS_TEMPLATES.slice(0, visibleTemplates).map(
          (template, index) => {
            const IconComponent =
              TEMPLATE_ICONS[template.icon as keyof typeof TEMPLATE_ICONS] ??
              Cog;
            const isSelected = selectedTemplateId === template.id;
            const localizedTemplate = getLocalizedTemplate(template);

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{
                  y: -4,
                  transition: { duration: 0.2 },
                }}
                className="group"
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/40 ${
                    isSelected
                      ? "border-primary/40 bg-primary/10 shadow-md ring-2 ring-primary/40"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.div
                          className={`p-2 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted group-hover:bg-primary/20"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <IconComponent className="h-6 w-6" />
                        </motion.div>
                        <div>
                          <CardTitle className="text-lg">
                            {localizedTemplate.name}
                          </CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {I18nHelpers.getContextualTranslation(
                              "industries",
                              template.industry,
                              template.industry,
                            )}
                          </Badge>
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </motion.div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {localizedTemplate.description}
                    </CardDescription>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="sections" className="border-none">
                        <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                          <div className="flex items-center space-x-2">
                            <span>
                              Included Sections ({template.sections.length})
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <div className="flex flex-wrap gap-1">
                            {template.sections.map((sectionId) => (
                              <Badge
                                key={sectionId}
                                variant="outline"
                                className="text-xs"
                              >
                                {getSectionName(sectionId)}
                              </Badge>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {template.defaultRoles &&
                        template.defaultRoles.length > 0 && (
                          <AccordionItem value="roles" className="border-none">
                            <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                              <div className="flex items-center space-x-2">
                                <span>
                                  Default Roles ({template.defaultRoles.length})
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="flex flex-wrap gap-1">
                                {template.defaultRoles.map((role) => (
                                  <Badge
                                    key={role}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {role.replace("-", " ")}
                                  </Badge>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}
                    </Accordion>
                  </CardContent>
                </Card>
              </motion.div>
            );
          },
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/40"></div>
        </div>
      )}

      {/* Intersection observer target */}
      <div ref={loadMoreRef} className="h-1" />

      {/* Load more button (fallback) */}
      {visibleTemplates < BUSINESS_TEMPLATES.length && !isLoading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMoreTemplates}
            className="group"
          >
            <span>Load More Templates</span>
            <ChevronDown className="ml-2 h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
          </Button>
        </div>
      )}

      {selectedTemplateId && (
        <motion.div
          className="mt-6 p-4 bg-success-muted border border-success/40 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-success dark: " />
            <span className="text-success font-medium">
              Template Selected:{" "}
              {(() => {
                const template = BUSINESS_TEMPLATES.find(
                  (t) => t.id === selectedTemplateId,
                );
                return template
                  ? getLocalizedTemplate(template).name
                  : t("onboarding.customTemplate.title");
              })()}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
