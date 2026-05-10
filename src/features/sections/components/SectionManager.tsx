import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus, Settings, Trash2 } from "lucide-react";
import { AVAILABLE_SECTIONS } from "@/data/availableSections";
import {
  CustomSection as TemplateSection,
  BusinessTemplate,
} from "@/types/templates";
import { useCan } from "@/hooks/useCan";
import { useCompany } from "@/hooks/useCompany";
import { useCustomSections, CustomSection } from "@/hooks/useCustomSections";
import SectionFilters from "./SectionFilters";
import SectionActions from "./SectionActions";
import SectionCategoryGroup from "./SectionCategoryGroup";
import SectionTemplateSelector from "./SectionTemplateSelector";
import SectionEditor from "./SectionEditor";
import CustomSectionCard from "./CustomSectionCard";

interface SectionManagerProps {
  selectedSections: string[];
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  businessTemplate?: BusinessTemplate;
  isOnboarding?: boolean;
}

export default function SectionManager({
  selectedSections,
  onSectionToggle,
  businessTemplate,
  isOnboarding = false,
}: SectionManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "core" | "industry" | "custom" | "operations"
  >("all");
  const [sections, setSections] =
    useState<TemplateSection[]>(AVAILABLE_SECTIONS);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingSection, setEditingSection] = useState<
    CustomSection | undefined
  >();

  const { can } = useCan();
  const { company } = useCompany();
  const {
    sections: customSections,
    templates,
    loading: customLoading,
    createSection,
    updateSection,
    deleteSection,
  } = useCustomSections();

  useEffect(() => {
    // Filter sections based on template compatibility or company settings
    let filteredSections = AVAILABLE_SECTIONS;

    if (businessTemplate) {
      filteredSections = AVAILABLE_SECTIONS.filter((section) => {
        // Always include core sections - they should be available for all templates
        if (section.category === "core") return true;

        // For industry and custom sections, check if they're included in the template
        if (section.category === "industry" || section.category === "custom") {
          // If section has a specific templateId, it must match
          if (section.templateId && section.templateId !== businessTemplate.id)
            return false;

          // Otherwise, include if it's in the template's section list
          return businessTemplate.sections.includes(section.id);
        }

        // Default: include the section
        return true;
      });
    } else if (company && !isOnboarding) {
      // When not in onboarding and we have a company, filter by enabled sections
      const enabledSections = Array.isArray(company.enabled_sections)
        ? company.enabled_sections
        : JSON.parse(company.enabled_sections || "[]");

      filteredSections = AVAILABLE_SECTIONS.filter((section) =>
        enabledSections.includes(section.id),
      );
    }

    setSections(filteredSections);
  }, [businessTemplate, company, isOnboarding]);

  // Combine default and custom sections for display
  const allSections = [
    ...sections,
    ...customSections.map((cs) => ({
      id: cs.id,
      name: cs.name,
      description: cs.description || "",
      icon: cs.icon,
      path: cs.path,
      permissions: cs.permissions,
      enabled: cs.is_active,
      order: cs.sort_order,
      category: cs.category as "core" | "industry" | "custom" | "operations",
      isCustom: true,
    })),
  ];

  const handleCreateFromTemplate = async (template: any) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowEditor(true);
  };

  const handleCreateCustom = (category?: string) => {
    setSelectedTemplate(null);
    setEditingSection(undefined);
    setShowTemplateSelector(false);
    setShowEditor(true);
  };

  const handleAddFromTemplate = (category: string) => {
    setShowTemplateSelector(true);
  };

  const handleEditSection = (section: CustomSection) => {
    setEditingSection(section);
    setSelectedTemplate(null);
    setShowEditor(true);
  };

  const handleSaveSection = async (sectionData: Partial<CustomSection>) => {
    if (editingSection) {
      await updateSection(editingSection.id, sectionData);
    } else {
      await createSection(sectionData, selectedTemplate?.id);
    }
    setShowEditor(false);
    setEditingSection(undefined);
    setSelectedTemplate(null);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this section? This action cannot be undone.",
      )
    ) {
      await deleteSection(sectionId);
    }
  };

  const filteredSections = allSections.filter((section) => {
    const matchesSearch =
      section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || section.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedSections = filteredSections.reduce(
    (acc, section) => {
      if (!acc[section.category]) {
        acc[section.category] = [];
      }
      acc[section.category].push(section);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const handleSelectAll = () => {
    filteredSections.forEach((section) => {
      if (!selectedSections.includes(section.id)) {
        onSectionToggle(section.id, true);
      }
    });
  };

  const handleDeselectAll = () => {
    filteredSections.forEach((section) => {
      if (selectedSections.includes(section.id)) {
        onSectionToggle(section.id, false);
      }
    });
  };

  const getSectionBadgeColor = (category: string) => {
    switch (category) {
      case "core":
        return "bg-blue-100 text-blue-800";
      case "industry":
        return "bg-green-100 text-green-800";
      case "custom":
        return "bg-purple-100 text-purple-800";
      case "operations":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTogglePermission = (section: any) => {
    // During onboarding, allow toggling all sections
    if (isOnboarding) return true;

    // After onboarding, core sections require system settings permission
    if (section.category === "core") return can("systemSettings");

    // Other sections can be toggled by anyone with appropriate permissions
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {isOnboarding ? "Choose Your Sections" : "Customize Your Sections"}
          </h3>
          <p className="text-gray-600 mt-1">
            {isOnboarding
              ? "Select the features and sections you want in your workspace"
              : "Enable or disable sections based on your business needs"}
          </p>
        </div>
        {can("systemSettings") && !isOnboarding && (
          <div className="flex gap-2">
            <SectionTemplateSelector
              templates={templates}
              onSelectTemplate={handleCreateFromTemplate}
              onCreateCustom={handleCreateCustom}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between space-x-4">
        <SectionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />
        <SectionActions
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          showManageLink={isOnboarding}
        />
      </div>

      <div className="space-y-6">
        {/* Custom Sections - Show prominently with enhanced cards */}
        {customSections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Custom Sections
              </h4>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200"
              >
                {customSections.length} Custom
              </Badge>
            </div>
            <div className="grid gap-4">
              {customSections
                .filter(
                  (section) =>
                    section.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) &&
                    (categoryFilter === "all" ||
                      categoryFilter === "custom" ||
                      section.category === categoryFilter),
                )
                .map((section) => (
                  <CustomSectionCard
                    key={section.id}
                    section={section}
                    isEnabled={selectedSections.includes(section.id)}
                    canToggle={getTogglePermission(section)}
                    onToggle={(enabled) => onSectionToggle(section.id, enabled)}
                    onEdit={() => handleEditSection(section)}
                    onDelete={() => handleDeleteSection(section.id)}
                    onDuplicate={() => {
                      /* TODO: Implement duplicate */
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Default Sections */}
        {Object.entries(groupedSections)
          .filter(
            ([category]) =>
              category !== "custom" || customSections.length === 0,
          )
          .map(([category, categorySections]) => (
            <SectionCategoryGroup
              key={category}
              category={category}
              sections={categorySections.filter((s) => !s.isCustom)}
              selectedSections={selectedSections}
              isOnboarding={isOnboarding}
              onSectionToggle={onSectionToggle}
              getTogglePermission={getTogglePermission}
              getSectionBadgeColor={getSectionBadgeColor}
              onEditSection={
                can("systemSettings") ? handleEditSection : undefined
              }
              onDeleteSection={
                can("systemSettings") ? handleDeleteSection : undefined
              }
              onAddSection={
                can("systemSettings") ? handleCreateCustom : undefined
              }
              onAddFromTemplate={
                can("systemSettings") ? handleAddFromTemplate : undefined
              }
              canManageSections={can("systemSettings")}
            />
          ))}
      </div>

      {Object.keys(groupedSections).length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No sections found
          </h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Section Editor Dialog */}
      <SectionEditor
        section={editingSection}
        template={selectedTemplate}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingSection(undefined);
          setSelectedTemplate(null);
        }}
        onSave={handleSaveSection}
      />
    </div>
  );
}
