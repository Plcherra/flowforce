import React, { useMemo, useState } from "react";
import { useParams, Navigate, useNavigate } from "@/lib/router-adapter";
import { useCustomSections } from "@/hooks/useCustomSections";
import { LoadingSpinner } from "@/components/ui/loading-states";
import CompanyUpdatesSection from "./CompanyUpdatesSection";
import EventsIndex from "@/sections/events/index";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Edit, ArrowLeft } from "lucide-react";
import * as Icons from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { SectionConfigurationWizard } from "@/features/sections/components/SectionConfigurationWizard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSectionComponent } from "@/features/sections/components/componentRegistry";
import { logger } from "@/utils/logger";

interface DynamicSectionProps {
  sectionPath?: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "page";

const extractSlug = (value?: string | null) => {
  if (!value) return "";
  const parts = String(value).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
};

const getSectionSlug = (
  section: Record<string, unknown> | null | undefined,
) => {
  const raw = String(section?.path || "").replace(/^\/+/, "");
  return raw || slugify(String(section?.name || section?.id || "section"));
};

export default function DynamicSection({ sectionPath }: DynamicSectionProps) {
  const { path, "*": pageSplat } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sections, loading, refetch } = useCustomSections();

  const targetPath = sectionPath || path;
  const pageSlug = pageSplat
    ? pageSplat.split("/").filter(Boolean)[0]
    : undefined;

  const section = useMemo(() => {
    if (!targetPath) return undefined;
    const normalizedTarget = String(targetPath).replace(/^\/+/, "");
    return sections.find(
      (s) => String(s.path || "").replace(/^\/+/, "") === normalizedTarget,
    );
  }, [sections, targetPath]);

  const [showWizard, setShowWizard] = useState(false);

  if (loading) {
    return <LoadingSpinner text="Loading section..." />;
  }

  if (!section) {
    return <Navigate to="/dashboard" replace />;
  }

  const sectionSlug = getSectionSlug(section);
  const templateKey = (section.template_id || "").toString().toLowerCase();
  const sectionRoute = (section.path || "").toString().toLowerCase();
  const sectionName = (section.name || "").toString().toLowerCase();
  const isHelpDeskSection =
    templateKey === "help-desk" ||
    sectionRoute.includes("help-desk") ||
    sectionName.includes("help desk");

  const handleWizardSave = async (updates: Record<string, unknown>) => {
    try {
      await supabase
        .from("custom_sections")
        .update({
          name: updates.name ?? section.name,
          description: updates.description ?? section.description,
          icon: updates.icon ?? section.icon,
          permissions: updates.permissions ?? section.permissions,
        })
        .eq("id", section.id);

      const { data: existingPages } = await supabase
        .from("custom_section_pages")
        .select("id, route, name")
        .eq("section_id", section.id);

      const existingBySlug = new Map(
        (existingPages || []).map((page: Record<string, unknown>) => {
          const slug = extractSlug(String(page.route || page.name || ""));
          return [slug, page];
        }),
      );

      const finalPages = (
        Array.isArray(updates.pages) ? updates.pages : []
      ).map((p: Record<string, unknown>, index: number) => {
        const baseSlug = slugify(
          extractSlug(p.route) || p.name || p.title || `page-${index + 1}`,
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
            section_id: section.id,
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
      const pagesToInsert: Record<string, unknown>[] = [];
      const pagesToUpdate: { id: string; values: Record<string, unknown> }[] =
        [];

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
        .filter((page: Record<string, unknown>) => {
          const slug = extractSlug(String(page.route || page.name || ""));
          return slug && !seenSlugs.has(slug);
        })
        .map((page: Record<string, unknown>) => page.id as string);

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

      await refetch();
      toast({ title: "Section updated" });
    } catch (error) {
      logger.error("Failed to configure section", { error, tags: ["error"] });
      toast({ title: "Failed to configure section", variant: "destructive" });
      throw error;
    }
  };

  if (!pageSlug) {
    if (isHelpDeskSection) {
      return <Navigate to="/app/help-desk" replace />;
    }

    if (
      templateKey.includes("event") ||
      sectionRoute.includes("event") ||
      sectionName.includes("event")
    ) {
      return <EventsIndex />;
    }

    switch (templateKey || sectionRoute || sectionName) {
      case "company-updates":
      case "/updates":
        return <CompanyUpdatesSection />;
      case "employee-directory":
      case "/directory":
        return <Navigate to="/employees" replace={false} />;
      default:
        return (
          <>
            <GenericSectionRenderer
              section={section}
              onOpenWizard={() => setShowWizard(true)}
              onNavigateToPage={(page) => {
                const slug =
                  extractSlug(page.route) ||
                  slugify(page.name || page.title || "page");
                navigate(`/app/section/${sectionSlug}/${slug}`);
              }}
            />
            <SectionConfigurationWizard
              section={section}
              open={showWizard}
              onOpenChange={setShowWizard}
              onSave={async (updates) => {
                await handleWizardSave(updates);
              }}
            />
          </>
        );
    }
  }

  const page = section.custom_section_pages?.find(
    (p: Record<string, unknown>) =>
      extractSlug(String(p.route || p.name || p.title || "")) === pageSlug,
  );

  if (!page) {
    return <Navigate to={`/app/section/${sectionSlug}`} replace />;
  }

  return (
    <>
      <SectionPageView
        section={section}
        page={page}
        onBack={() => navigate(`/app/section/${sectionSlug}`)}
        onOpenWizard={() => setShowWizard(true)}
      />
      <SectionConfigurationWizard
        section={section}
        open={showWizard}
        onOpenChange={setShowWizard}
        onSave={async (updates) => {
          await handleWizardSave(updates);
        }}
      />
    </>
  );
}

function GenericSectionRenderer({
  section,
  onOpenWizard,
  onNavigateToPage,
}: {
  section: Record<string, unknown>;
  onOpenWizard: () => void;
  onNavigateToPage: (page: Record<string, unknown>) => void;
}) {
  const { can } = useCan();
  const navigate = useNavigate();

  const hasPages =
    Array.isArray(section?.custom_section_pages) &&
    section.custom_section_pages.length > 0;

  const getIcon = () => {
    if (section.icon && section.icon.length === 1) {
      return <span className="text-base">{section.icon}</span>;
    }

    const IconComponent = (Icons as Record<string, React.ComponentType>)[
      String(section.icon || "")
    ] as React.ComponentType | undefined;
    if (IconComponent) {
      return <IconComponent className="h-4 w-4" />;
    }

    return <Icons.FileText className="h-4 w-4" />;
  };

  const getSectionType = () => {
    const tk = (section.template_id || "").toString().toLowerCase();
    const route = (section.path || "").toString().toLowerCase();
    const name = (section.name || "").toString().toLowerCase();

    if (
      tk.includes("event") ||
      route.includes("event") ||
      name.includes("event")
    )
      return "Events";
    if (tk === "2" || name.includes("updates")) return "Company Updates";
    return "Custom Section";
  };

  const badgeClass = (() => {
    switch (getSectionType()) {
      case "Events":
        return "bg-blue-100 text-blue-800";
      case "Company Updates":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                {getIcon()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">
                    {section.name || "Unnamed Section"}
                  </h1>
                  <Badge className={badgeClass}>{getSectionType()}</Badge>
                </div>
                {section.description && (
                  <p className="text-muted-foreground mt-1">
                    {section.description}
                  </p>
                )}
              </div>
            </div>

            {can("systemSettings") && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/sections-permissions")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" onClick={onOpenWizard}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Section
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasPages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(section.custom_section_pages)
              ? section.custom_section_pages
              : []
            ).map((page: Record<string, unknown>, index: number) => {
              const IconComponent =
                (page.icon &&
                  (Icons as Record<string, React.ComponentType>)[
                    String(page.icon)
                  ]) ||
                Icons.FileText;
              const componentMeta =
                getSectionComponent(
                  page.componentId ||
                    extractSlug(page.content?.[0]?.component) ||
                    page.content?.[0]?.type,
                ) ||
                getSectionComponent(
                  page.content?.[0]?.component || page.content?.[0]?.type,
                );

              return (
                <Card
                  key={page.id || index}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          {page.title || page.name}
                        </CardTitle>
                      </div>
                      {componentMeta && (
                        <Badge variant="outline" className="text-xs">
                          {componentMeta.label}
                        </Badge>
                      )}
                    </div>
                    {page.description && (
                      <CardDescription>{page.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Open this page to view its configured components.
                    </p>
                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateToPage(page)}
                      >
                        View Page
                      </Button>
                      {can("systemSettings") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onOpenWizard}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/20 rounded-full w-fit">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>No Content Yet</CardTitle>
              <CardDescription>
                This section doesn't have any pages or content set up yet.
                {can("systemSettings")
                  ? " You can add pages and configure this section to get started."
                  : " Contact your administrator to set up this section."}
              </CardDescription>
            </CardHeader>
            {can("systemSettings") ? (
              <CardContent className="text-center">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add pages, customize the layout, and configure content for
                    this section.
                  </p>
                  <Button onClick={onOpenWizard}>
                    <Plus className="h-4 w-4 mr-2" />
                    Configure Section
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  {section.description ||
                    "Contact your administrator to set up this section."}
                </p>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function SectionPageView({
  section,
  page,
  onBack,
  onOpenWizard,
}: {
  section: Record<string, unknown>;
  page: Record<string, unknown>;
  onBack: () => void;
  onOpenWizard: () => void;
}) {
  const { can } = useCan();
  const IconComponent =
    (page.icon &&
      (Icons as Record<string, React.ComponentType>)[String(page.icon)]) ||
    Icons.FileText;
  const componentEntry =
    Array.isArray(page.content) && page.content.length > 0
      ? page.content[0]
      : null;
  const componentId =
    page.componentId || componentEntry?.component || componentEntry?.type;
  const componentMeta = componentId
    ? getSectionComponent(componentId)
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="px-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                  <IconComponent className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {page.title || page.name}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {componentMeta
                      ? `Powered by ${componentMeta.label}`
                      : "Custom page configuration"}
                  </p>
                </div>
              </div>
            </div>
            {can("systemSettings") && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onOpenWizard}>
                  <Edit className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {componentMeta ? (
          <div className="space-y-4">
            {componentMeta.render({ section, page, config: componentEntry })}
          </div>
        ) : (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>This page has no components yet</CardTitle>
              <CardDescription>
                Configure the page to add interactive widgets and data sources.
              </CardDescription>
            </CardHeader>
            {can("systemSettings") && (
              <CardContent>
                <Button onClick={onOpenWizard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configure Page
                </Button>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
