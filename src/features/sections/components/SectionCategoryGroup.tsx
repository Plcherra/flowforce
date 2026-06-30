import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers, Plus } from "lucide-react";
import SectionCard from "./SectionCard";

interface SectionCategoryGroupProps {
  category: string;
  sections: any[];
  selectedSections: string[];
  isOnboarding: boolean;
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  getTogglePermission: (section: any) => boolean;
  getSectionBadgeColor: (category: string) => string;
  onEditSection?: (section: any) => void;
  onDeleteSection?: (sectionId: string) => void;
  onAddSection?: (category: string) => void;
  onAddFromTemplate?: (category: string) => void;
  canManageSections?: boolean;
}

export default function SectionCategoryGroup({
  category,
  sections,
  selectedSections,
  isOnboarding,
  onSectionToggle,
  getTogglePermission,
  getSectionBadgeColor,
  onEditSection,
  onDeleteSection,
  onAddSection,
  onAddFromTemplate,
  canManageSections = false,
}: SectionCategoryGroupProps) {
  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "core":
        return "Core Features";
      case "industry":
        return "Industry-Specific";
      case "custom":
        return "Custom Sections";
      case "operations":
        return "Operations";
      default:
        return "Other";
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case "core":
        return "Essential features available to all businesses";
      case "industry":
        return "Specialized features for your industry";
      case "custom":
        return "Custom sections created for your business";
      case "operations":
        return "Business operations and workflow management";
      default:
        return "";
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-900 flex items-center">
          <Layers className="h-4 w-4 mr-2" />
          {getCategoryTitle(category)}
          <Badge variant="secondary" className="ml-2">
            {sections.length}
          </Badge>
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          {getCategoryDescription(category)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const isEnabled = selectedSections.includes(section.id);
          const canToggle = getTogglePermission(section);

          return (
            <SectionCard
              key={section.id}
              section={section}
              isEnabled={isEnabled}
              canToggle={canToggle}
              isOnboarding={isOnboarding}
              onToggle={(enabled) => onSectionToggle(section.id, enabled)}
              getSectionBadgeColor={getSectionBadgeColor}
              onEdit={
                section.isCustom && onEditSection
                  ? () => onEditSection(section)
                  : undefined
              }
              onDelete={
                section.isCustom && onDeleteSection
                  ? () => onDeleteSection(section.id)
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Add Section Button */}
      {canManageSections && !isOnboarding && (
        <div className="mt-4 pt-4 border-t border-dashed border-muted-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Section to {getCategoryTitle(category)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {onAddFromTemplate && (
                <DropdownMenuItem onClick={() => onAddFromTemplate(category)}>
                  Create from Template
                </DropdownMenuItem>
              )}
              {onAddSection && (
                <DropdownMenuItem onClick={() => onAddSection(category)}>
                  Create Custom Section
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
