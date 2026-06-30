import { useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wand2, Settings } from "lucide-react";
import * as Icons from "lucide-react";

import {
  QUICK_TEMPLATES,
  getTemplatesByCategory,
} from "@/data/sectionTemplates";
import { useCustomSections } from "@/hooks/useCustomSections";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateSectionDialog } from "@/features/sections/components/CreateSectionDialog";
import { SectionConfigurationWizard } from "@/features/sections/components/SectionConfigurationWizard";
import { logger } from "@/utils/logger";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "page";

export default function AddSection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [newSection, setNewSection] = useState(null);
  const { createSection } = useCustomSections();
  const { toast } = useToast();

  const initialCategory = searchParams.get("category") || "communication";

  const handleCreateFromTemplate = async (templateId: string) => {
    setIsCreating(true);
    try {
      const template = QUICK_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      const createdSection = await createSection(
        {
          name: template.name,
          description: template.description,
          icon: template.icon,
          category: template.category as any,
          path: template.config.path,
          permissions: template.config.permissions,
        },
        templateId,
      );

      setNewSection(createdSection);
      setShowConfigWizard(true);
    } catch (error) {
      logger.error("Error creating section:", { error, tags: ["error"] });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSectionCreated = (section: any) => {
    setNewSection(section);
    setShowCustomDialog(false);
    setShowConfigWizard(true);
  };

  const handleConfigurationComplete = async (updates: any) => {
    try {
      if (!newSection) return;

      // 1) Update section metadata/permissions
      await supabase
        .from("custom_sections")
        .update({
          name: updates.name ?? newSection.name,
          description: updates.description ?? newSection.description,
          icon: updates.icon ?? newSection.icon,
          permissions: updates.permissions ?? newSection.permissions,
        })
        .eq("id", newSection.id);

      // 2) Sync pages based on wizard selection
      const { data: existingPages } = await supabase
        .from("custom_section_pages")
        .select("id, route, name")
        .eq("section_id", newSection.id);

      const sectionSlug =
        String(newSection.path || "").replace(/^\/+/, "") ||
        slugify(newSection.name || newSection.id);

      const existingBySlug = new Map(
        (existingPages || []).map((page: any) => {
          const slug = String(page.route || "")
            .split("/")
            .filter(Boolean)
            .pop();
          return [slug, page];
        }),
      );

      const finalPages = (updates.pages || []).map((p: any, index: number) => {
        const baseSlug = slugify(
          (p.route || "").split("/").filter(Boolean).pop() ||
            p.name ||
            p.title ||
            `page-${index + 1}`,
        );
        const route = `/${sectionSlug}/${baseSlug}`;
        const primaryContent =
          Array.isArray(p.content) && p.content.length > 0 ? p.content[0] : {};
        const componentId =
          p.componentId ||
          primaryContent?.component ||
          primaryContent?.type ||
          "feed";

        return {
          slug: baseSlug,
          payload: {
            section_id: newSection.id,
            name: p.name || baseSlug,
            title: p.title || p.name || "Page",
            description: p.description || null,
            icon: p.icon || "FileText",
            route,
            content: [
              {
                ...primaryContent,
                type: componentId,
                component: componentId,
                title: primaryContent?.title || p.title || p.name || "Page",
              },
            ],
            permissions:
              Array.isArray(p.permissions) && p.permissions.length > 0
                ? p.permissions
                : ["viewOwnProfile"],
            sort_order: index,
          },
        };
      });

      const seenSlugs = new Set<string>();
      const pagesToInsert: any[] = [];
      const pagesToUpdate: { id: string; values: unknown }[] = [];

      finalPages.forEach(({ slug, payload }) => {
        seenSlugs.add(slug);
        const existing = existingBySlug.get(slug);
        if (existing) {
          pagesToUpdate.push({ id: existing.id, values: payload });
        } else {
          pagesToInsert.push(payload);
        }
      });

      const pagesToDelete = (existingPages || [])
        .filter((page: any) => {
          const slug = String(page.route || "")
            .split("/")
            .filter(Boolean)
            .pop();
          return slug && !seenSlugs.has(slug);
        })
        .map((page: any) => page.id);

      for (const { id, values } of pagesToUpdate) {
        await supabase.from("custom_section_pages").update(values).eq("id", id);
      }

      if (pagesToInsert.length > 0) {
        await supabase.from("custom_section_pages").insert(pagesToInsert);
      }

      if (pagesToDelete.length > 0) {
        await supabase
          .from("custom_section_pages")
          .delete()
          .in("id", pagesToDelete);
      }

      toast({
        title: "Section Configured",
        description: `${updates.name || newSection.name} is now ready`,
      });

      // 3) Navigate to new section
      navigate(`/app/section/${sectionSlug}`);
    } catch (error) {
      logger.error("Error configuring section:", { error, tags: ["error"] });
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? (
      <IconComponent className="h-5 w-5" />
    ) : (
      <Icons.FileText className="h-5 w-5" />
    );
  };

  const categories = [
    {
      key: "communication",
      label: "Communication",
      description: "Connect and inform your team",
    },
    {
      key: "operations",
      label: "Operations",
      description: "Manage daily operations and workflows",
    },
    {
      key: "hr",
      label: "HR & People",
      description: "Human resources and employee management",
    },
  ];

  return (
    <div>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate(-1)}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Add New Section
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose a template or create from scratch
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/sections-permissions")}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Manage Sections</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomDialog(true)}
                  className="flex items-center space-x-2"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>Create from Scratch</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue={initialCategory} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              {categories.map((category) => (
                <TabsTrigger key={category.key} value={category.key}>
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent
                key={category.key}
                value={category.key}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {category.label}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {category.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getTemplatesByCategory(category.key).map((template) => (
                    <Card
                      key={template.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleCreateFromTemplate(template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getIcon(template.icon)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {template.name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>

                        {template.config.pages &&
                          template.config.pages.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Includes:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {template.config.pages
                                  .slice(0, 3)
                                  .map((page, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {page.title}
                                    </Badge>
                                  ))}
                                {template.config.pages.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{template.config.pages.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                        <Button
                          className="w-full mt-4"
                          disabled={isCreating}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateFromTemplate(template.id);
                          }}
                        >
                          {isCreating ? "Adding..." : "Add Section"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {getTemplatesByCategory(category.key).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No templates available for this category yet.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowCustomDialog(true)}
                    >
                      Create Custom Section
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <CreateSectionDialog
          open={showCustomDialog}
          onOpenChange={setShowCustomDialog}
          onSuccess={handleSectionCreated}
        />

        {newSection && (
          <SectionConfigurationWizard
            section={newSection}
            open={showConfigWizard}
            onOpenChange={setShowConfigWizard}
            onSave={handleConfigurationComplete}
          />
        )}
      </div>
    </div>
  );
}
