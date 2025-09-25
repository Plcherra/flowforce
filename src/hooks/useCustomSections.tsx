import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QUICK_TEMPLATES } from '@/data/sectionTemplates';

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

export function useCustomSections() {
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_sections')
        .select(`
          *,
          pages:custom_section_pages(*)
        `)
        .order('sort_order');

      if (error) throw error;
      setSections((data || []).map(section => ({
        ...section,
        permissions: Array.isArray(section.permissions) ? section.permissions : JSON.parse(section.permissions as string || '[]'),
        pages: (section.pages || []).map((page: any) => ({
          ...page,
          content: Array.isArray(page.content) ? page.content : JSON.parse(page.content as string || '[]'),
          permissions: Array.isArray(page.permissions) ? page.permissions : JSON.parse(page.permissions as string || '[]')
        }))
      })));
    } catch (error) {
      console.error('Error fetching custom sections:', error);
      toast({
        title: "Error",
        description: "Failed to load custom sections",
        variant: "destructive"
      });
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('section_templates')
        .select('*')
        .order('category, name');

      if (error) throw error;
      setTemplates((data || []).map(template => ({
        ...template,
        config: typeof template.config === 'object' ? template.config : JSON.parse(template.config as string || '{}'),
        default_pages: Array.isArray(template.default_pages) ? template.default_pages : JSON.parse(template.default_pages as string || '[]'),
        default_permissions: Array.isArray(template.default_permissions) ? template.default_permissions : JSON.parse(template.default_permissions as string || '[]')
      })));
    } catch (error) {
      console.error('Error fetching section templates:', error);
      toast({
        title: "Error",
        description: "Failed to load section templates",
        variant: "destructive"
      });
    }
  };

  const createSection = async (sectionData: Partial<CustomSection>, templateId?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: companyData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userData.user?.id)
        .single();

      if (!companyData?.company_id) {
        throw new Error('No company associated with user');
      }

      let template: any = null;
      if (templateId) {
        const { data: templateData } = await supabase
          .from('section_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (templateData) {
          template = {
            ...templateData,
            config: typeof templateData.config === 'object' ? templateData.config : JSON.parse(templateData.config as string || '{}'),
            default_pages: Array.isArray(templateData.default_pages) ? templateData.default_pages : JSON.parse(templateData.default_pages as string || '[]'),
            default_permissions: Array.isArray(templateData.default_permissions) ? templateData.default_permissions : JSON.parse(templateData.default_permissions as string || '[]')
          };
        } else {
          // Fallback to local quick templates if DB template not found
          const local = QUICK_TEMPLATES.find(t => t.id === templateId);
          if (local) {
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
                icon: p.icon || 'FileText',
                route: p.route,
                content: p.content || [],
                permissions: p.permissions || [],
              })),
              default_permissions: local.config?.permissions || [],
            };
          }
        }
      }

      const newSection = {
        name: sectionData.name!,
        description: sectionData.description,
        icon: sectionData.icon!,
        category: sectionData.category!,
        path: sectionData.path!,
        company_id: companyData.company_id,
        created_by: userData.user!.id,
        template_id: templateId,
        template_config: template?.config || {},
        permissions: template?.default_permissions || sectionData.permissions || [],
        sort_order: sections.length,
        is_active: true,
        is_template: false
      };

      const { data: section, error } = await supabase
        .from('custom_sections')
        .insert(newSection)
        .select()
        .single();

      if (error) throw error;

      // Create default pages if template exists (DB or local fallback)
      if (template && template.default_pages && template.default_pages.length > 0) {
        const pages = template.default_pages.map((page: any, index: number) => ({
          ...page,
          section_id: section.id,
          sort_order: index
        }));

        await supabase
          .from('custom_section_pages')
          .insert(pages);
      }

      await fetchSections();
      toast({
        title: "Success",
        description: "Section created successfully"
      });

      return section;
    } catch (error) {
      console.error('Error creating section:', error);
      toast({
        title: "Error",
        description: "Failed to create section",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSection = async (id: string, updates: Partial<CustomSection>) => {
    try {
      const { error } = await supabase
        .from('custom_sections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchSections();
      toast({
        title: "Success",
        description: "Section updated successfully"
      });
    } catch (error) {
      console.error('Error updating section:', error);
      toast({
        title: "Error",
        description: "Failed to update section",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSections();
      toast({
        title: "Success",
        description: "Section deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSectionOrder = async (sections: { id: string; sort_order: number }[]) => {
    try {
      const updates = sections.map(({ id, sort_order }) => ({ id, sort_order }));
      
      for (const update of updates) {
        await supabase
          .from('custom_sections')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

      await fetchSections();
    } catch (error) {
      console.error('Error updating section order:', error);
      toast({
        title: "Error",
        description: "Failed to update section order",
        variant: "destructive"
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
    refetch: fetchSections
  };
}
