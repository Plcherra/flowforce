import { useState } from "react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Plus } from "lucide-react";
import { BusinessTemplate } from "@/types/templates";
import { AVAILABLE_SECTIONS } from "@/data/availableSections";
import SectionBuilder from "./SectionBuilder";
import { CustomSection } from "@/types/customTemplate";
import { useTranslation } from "react-i18next";

interface SectionCustomizationStepProps {
  selectedTemplate: BusinessTemplate;
  enabledSections: string[];
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  customSections?: CustomSection[];
  onCustomSectionsChange?: (sections: CustomSection[]) => void;
}

export default function SectionCustomizationStep({
  selectedTemplate,
  enabledSections,
  onSectionToggle,
  customSections = [],
  onCustomSectionsChange = () => {},
}: SectionCustomizationStepProps) {
  const { t } = useTranslation();
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    onSectionToggle(sectionId, enabled);
  };

  return (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-6 w-6" />
          {t("onboarding.sections.title")}
        </CardTitle>
        <CardDescription>
          {t("onboarding.sections.description")}
        </CardDescription>
      </CardHeader>

      {/* All Available Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {t("onboarding.sections.availableSections")}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSectionIds = AVAILABLE_SECTIONS.map((s) => s.id);
                const allSelected = allSectionIds.every((id) =>
                  enabledSections.includes(id),
                );
                if (allSelected) {
                  // Deselect all
                  allSectionIds.forEach((id) => onSectionToggle(id, false));
                } else {
                  // Select all
                  allSectionIds.forEach((id) => {
                    if (!enabledSections.includes(id)) {
                      onSectionToggle(id, true);
                    }
                  });
                }
              }}
            >
              {AVAILABLE_SECTIONS.every((s) => enabledSections.includes(s.id))
                ? t("onboarding.sections.deselectAll")
                : t("onboarding.sections.selectAll")}
            </Button>
            <Badge variant="outline">{selectedTemplate.name}</Badge>
            <Badge variant="secondary">
              {t("onboarding.sections.selected", {
                count: enabledSections.length,
              })}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4">
          {AVAILABLE_SECTIONS.map((section) => {
            const isEnabled = enabledSections.includes(section.id);
            const isFromTemplate = selectedTemplate.sections.includes(
              section.id,
            );

            return (
              <div
                key={section.id}
                className={`p-4 border rounded-lg transition-all ${
                  isEnabled
                    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isEnabled
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{section.name}</h4>
                        {isFromTemplate && (
                          <Badge variant="outline" className="text-xs">
                            {t("onboarding.sections.templateBadge")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleSectionToggle(section.id, checked)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Custom Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {t("onboarding.sections.customSections")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomBuilder(!showCustomBuilder)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCustomBuilder
              ? t("onboarding.sections.hideBuilder")
              : t("onboarding.sections.addCustomSection")}
          </Button>
        </div>

        {showCustomBuilder && (
          <SectionBuilder
            sections={customSections}
            onSectionsChange={onCustomSectionsChange}
          />
        )}

        {customSections.length > 0 && (
          <div className="grid gap-4">
            {customSections.map((section) => {
              const isEnabled = enabledSections.includes(section.id);

              return (
                <div
                  key={section.id}
                  className={`p-4 border rounded-lg transition-all ${
                    isEnabled
                      ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isEnabled
                            ? "bg-purple-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        {/* Custom icon would go here */}
                        <Settings className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{section.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {section.description}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {typeof section.category === "string"
                            ? section.category
                            : "Custom"}
                        </Badge>
                      </div>
                    </div>

                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        handleSectionToggle(section.id, checked)
                      }
                    />
                  </div>

                  {section.pages && section.pages.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {section.pages.map((page) => (
                          <Badge
                            key={page.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {page.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
