import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QUICK_TEMPLATES } from "@/data/sectionTemplates";
import { logger } from "@/utils/logger";

export interface CustomSection {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  icon: string;
  category: string;
  path: string;
  permissions: string[];
  is_active: boolean;
  is_template: boolean;
  template_id?: string;
  template_config: any;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  pages?: CustomSectionPage[];
}

export interface CustomSectionPage {
  id: string;
  section_id: string;
  name: string;
  title: string;
  description?: string;
  icon: string;
  route: string;
  content: any[];
  permissions: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  config: any;
  default_pages: any[];
  default_permissions: string[];
  is_public: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const parseJsonArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      logger.error("Failed to parse JSON array", { error, tags: ["error"] });
      return [];
    }
  }
  return [];
};

const isMissingTableError = (error: unknown) => {
  const candidate = error as { code?: string; message?: string } | null;
  return (
    candidate?.code === "PGRST205" ||
    candidate?.message?.includes("Could not find the table")
  );
};

const slugify = (value: string) => {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "page"
  );
};

const normalizeSectionPage = (page: any): CustomSectionPage => ({
  ...page,
  content: parseJsonArray(page?.content),
  permissions: parseJsonArray(page?.permissions),
});

const isQuickTasksString = (value?: string | null) =>
  typeof value === "string" && value.toLowerCase().includes("quick-task");

const shouldExcludeSection = (section: Partial<CustomSection>) => {
  if (!section) return false;
  return (
    isQuickTasksString(section.id) ||
    isQuickTasksString(section.template_id) ||
    isQuickTasksString(section.path) ||
    isQuickTasksString((section.template_config as any)?.path) ||
    isQuickTasksString(section.name)
  );
};

const shouldExcludeTemplate = (template: Partial<SectionTemplate>) => {
  if (!template) return false;
  return (
    isQuickTasksString(template.id) ||
    isQuickTasksString(template.name) ||
    isQuickTasksString((template.config as any)?.path)
  );
};

const normalizeSectionRecord = (section: any): CustomSection => ({
  ...section,
  permissions: parseJsonArray(section?.permissions),
  pages: Array.isArray(section?.pages)
    ? section.pages.map(normalizeSectionPage)
    : [],
});

export function useCustomSections() {
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_sections")
        .select(
          `
          *,
          pages:custom_section_pages(*)
        `,
        )
        .order("sort_order");

      if (error) throw error;
      setSections(
        (data || [])
          .map(normalizeSectionRecord)
          .filter((section) => !shouldExcludeSection(section)),
      );
    } catch (error) {
      if (isMissingTableError(error)) {
        setSections([]);
        return;
      }

      logger.error("Error fetching custom sections", {
        error,
        tags: ["error"],
      });
      toast({
        title: "Error",
        description: "Failed to load custom sections",
        variant: "destructive",
      });
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("section_templates")
        .select("*")
        .order("category, name");

      if (error) throw error;
      setTemplates(
        (data || [])
          .map((template) => ({
            ...template,
            config:
              typeof template.config === "object"
                ? template.config
                : JSON.parse((template.config as string) || "{}"),
            default_pages: parseJsonArray(template.default_pages),
            default_permissions: parseJsonArray(template.default_permissions),
          }))
          .filter((template) => !shouldExcludeTemplate(template)),
      );
    } catch (error) {
      if (isMissingTableError(error)) {
        setTemplates([]);
        return;
      }

      logger.error("Error fetching section templates", {
        error,
        tags: ["error"],
      });
      toast({
        title: "Error",
        description: "Failed to load section templates",
        variant: "destructive",
      });
    }
  };

  const createSection = async (
    sectionData: Partial<CustomSection>,
    templateId?: string,
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: companyData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user?.id)
        .single();

      if (!companyData?.company_id) {
        throw new Error("No company associated with user");
      }

      let template: any = null;
      if (templateId) {
        if (isQuickTasksString(templateId)) {
          toast({
            title: "Template unavailable",
            description:
              "Quick Tasks have been merged into the main Tasks experience.",
          });
          return null;
        }

        const { data: templateData } = await supabase
          .from("section_templates")
          .select("*")
          .eq("id", templateId)
          .single();

        if (templateData) {
          template = {
            ...templateData,
            config:
              typeof templateData.config === "object"
                ? templateData.config
                : JSON.parse((templateData.config as string) || "{}"),
            default_pages: Array.isArray(templateData.default_pages)
              ? templateData.default_pages
              : JSON.parse((templateData.default_pages as string) || "[]"),
            default_permissions: Array.isArray(templateData.default_permissions)
              ? templateData.default_permissions
              : JSON.parse(
                  (templateData.default_permissions as string) || "[]",
                ),
          };
        } else {
          // Fallback to local quick templates if DB template not found
          const local = QUICK_TEMPLATES.find((t) => t.id === templateId);
          if (local && !isQuickTasksString(local.id)) {
            template = {
              id: local.id,
              name: local.name,
              description: local.description,
              category: local.category,
              icon: local.icon,
              config: local.config || {},
              default_pages: (local.config?.pages || []).map((p: any) => ({
                name: p.name,
                title: p.title,
                description: p.description || null,
                icon: p.icon || "FileText",
                route: p.route,
                content: parseJsonArray(p.content),
                permissions: parseJsonArray(p.permissions),
              })),
              default_permissions: local.config?.permissions || [],
            };
          }
        }
      }

      const resolvedPathInput =
        sectionData.path ?? template?.config?.path ?? "";
      const sanitizedPath =
        resolvedPathInput.trim() ||
        `/${slugify(sectionData.name || "section")}`;
      const path = sanitizedPath.startsWith("/")
        ? sanitizedPath
        : `/${sanitizedPath}`;
      const sectionSlug = path.replace(/^\//, "");

      const { data: existing } = await supabase
        .from("custom_sections")
        .select("*, pages:custom_section_pages(*)")
        .eq("company_id", companyData.company_id)
        .eq("path", path)
        .maybeSingle();

      if (existing) {
        const normalized = normalizeSectionRecord(existing);
        toast({
          title: "Section already exists",
          description: `${normalized.name} is already configured for this workspace`,
        });
        return normalized;
      }

      const newSection = {
        name: sectionData.name!,
        description: sectionData.description,
        icon: sectionData.icon!,
        category: sectionData.category!,
        path,
        company_id: companyData.company_id,
        created_by: userData.user!.id,
        template_id: templateId,
        template_config: template?.config || {},
        permissions:
          template?.default_permissions || sectionData.permissions || [],
        sort_order: sections.length,
        is_active: true,
        is_template: false,
      };

      const { data: section, error } = await supabase
        .from("custom_sections")
        .insert(newSection)
        .select()
        .single();

      if (error) throw error;

      // Create default pages if template exists (DB or local fallback)
      let initialPages: any[] = [];

      if (
        template &&
        template.default_pages &&
        template.default_pages.length > 0
      ) {
        initialPages = template.default_pages.map(
          (page: any, index: number) => {
            const rawTitle = page.title || page.name || `Page ${index + 1}`;
            const derivedSlug = slugify(
              (page.route || "").split("/").filter(Boolean).pop() || rawTitle,
            );
            const route = `/${sectionSlug}/${derivedSlug}`;
            const pagePermissions = parseJsonArray(page.permissions);

            return {
              section_id: section.id,
              name: page.name || derivedSlug,
              title: rawTitle,
              description: page.description || null,
              icon: page.icon || "FileText",
              route,
              content: parseJsonArray(page.content),
              permissions:
                pagePermissions.length > 0
                  ? pagePermissions
                  : ["viewOwnProfile"],
              sort_order: index,
            };
          },
        );

        await supabase.from("custom_section_pages").insert(initialPages);
      }

      await fetchSections();
      toast({
        title: "Success",
        description: "Section created successfully",
      });

      return normalizeSectionRecord({ ...section, pages: initialPages });
    } catch (error) {
      logger.error("Error creating section", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to create section",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSection = async (id: string, updates: Partial<CustomSection>) => {
    try {
      const { error } = await supabase
        .from("custom_sections")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchSections();
      toast({
        title: "Success",
        description: "Section updated successfully",
      });
    } catch (error) {
      logger.error("Error updating section", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to update section",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSection = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchSections();
      toast({
        title: "Success",
        description: "Section deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting section", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSectionOrder = async (
    sections: { id: string; sort_order: number }[],
  ) => {
    try {
      const updates = sections.map(({ id, sort_order }) => ({
        id,
        sort_order,
      }));

      for (const update of updates) {
        await supabase
          .from("custom_sections")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      await fetchSections();
    } catch (error) {
      logger.error("Error updating section order", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to update section order",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSections(), fetchTemplates()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    sections,
    templates,
    loading,
    createSection,
    updateSection,
    deleteSection,
    updateSectionOrder,
    refetch: fetchSections,
  };
}
