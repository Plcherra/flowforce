-- Create custom sections table
CREATE TABLE public.custom_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'FileText',
  category TEXT NOT NULL DEFAULT 'custom',
  path TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_id TEXT,
  template_config JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom section pages table
CREATE TABLE public.custom_section_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.custom_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'FileText',
  route TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create section templates table
CREATE TABLE public.section_templates (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'FileText',
  config JSONB NOT NULL DEFAULT '{}',
  default_pages JSONB NOT NULL DEFAULT '[]',
  default_permissions JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_section_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_sections
CREATE POLICY "Company members can view sections" 
ON public.custom_sections 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Company admins can manage sections" 
ON public.custom_sections 
FOR ALL 
USING (company_id = get_user_company_id() AND is_company_admin());

-- RLS Policies for custom_section_pages
CREATE POLICY "Users can view pages from accessible sections" 
ON public.custom_section_pages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.custom_sections cs 
  WHERE cs.id = section_id AND cs.company_id = get_user_company_id()
));

CREATE POLICY "Company admins can manage section pages" 
ON public.custom_section_pages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.custom_sections cs 
  WHERE cs.id = section_id AND cs.company_id = get_user_company_id() AND is_company_admin()
));

-- RLS Policies for section_templates
CREATE POLICY "Anyone can view public templates" 
ON public.section_templates 
FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates" 
ON public.section_templates 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" 
ON public.section_templates 
FOR UPDATE 
USING (created_by = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_custom_sections_company_id ON public.custom_sections(company_id);
CREATE INDEX idx_custom_sections_category ON public.custom_sections(category);
CREATE INDEX idx_custom_section_pages_section_id ON public.custom_section_pages(section_id);
CREATE INDEX idx_section_templates_category ON public.section_templates(category);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_sections_updated_at
  BEFORE UPDATE ON public.custom_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_custom_section_pages_updated_at
  BEFORE UPDATE ON public.custom_section_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_section_templates_updated_at
  BEFORE UPDATE ON public.section_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert communication section templates
INSERT INTO public.section_templates (id, name, description, category, icon, config, default_pages, default_permissions) VALUES
('comm-updates', 'Updates & Posts', 'Company announcements, news feeds, and status updates', 'communication', 'Megaphone', 
 '{"features": ["posts", "announcements", "comments", "likes"], "layout": "feed"}',
 '[{"name": "Company Updates", "title": "Company Updates", "description": "Latest company news and announcements", "icon": "Megaphone", "route": "/updates", "content": [{"type": "feed", "title": "Updates Feed"}]}, {"name": "Announcements", "title": "Announcements", "description": "Important company announcements", "icon": "Bell", "route": "/announcements", "content": [{"type": "announcements", "title": "Announcements Board"}]}]',
 '["viewOwnProfile", "createPosts"]'),

('comm-directory', 'Employee Directory', 'Employee directory, contact lists, and organizational charts', 'communication', 'Users', 
 '{"features": ["directory", "contacts", "orgChart"], "layout": "grid"}',
 '[{"name": "Employee Directory", "title": "Employee Directory", "description": "Find and contact team members", "icon": "Users", "route": "/directory", "content": [{"type": "directory", "title": "Employee Directory"}]}, {"name": "Organization Chart", "title": "Organization Chart", "description": "Company organizational structure", "icon": "GitBranch", "route": "/org-chart", "content": [{"type": "orgChart", "title": "Organization Chart"}]}]',
 '["viewTeamProfiles"]'),

-- comm-events template removed: managed by canonical /events page

('comm-channels', 'Team Channels', 'Team channels and department communications', 'communication', 'MessageSquare', 
 '{"features": ["channels", "messaging", "threads"], "layout": "chat"}',
 '[{"name": "General Chat", "title": "General Chat", "description": "General team discussions", "icon": "MessageSquare", "route": "/chat/general", "content": [{"type": "chat", "title": "General Channel"}]}, {"name": "Department Channels", "title": "Department Channels", "description": "Department-specific communications", "icon": "Users", "route": "/channels", "content": [{"type": "channels", "title": "Department Channels"}]}]',
 '["viewOwnProfile", "sendMessages"]'),

('comm-polls', 'Polls & Surveys', 'Quick polls, feedback collection, and surveys', 'communication', 'BarChart3', 
 '{"features": ["polls", "surveys", "voting", "results"], "layout": "list"}',
 '[{"name": "Active Polls", "title": "Active Polls", "description": "Participate in company polls", "icon": "BarChart3", "route": "/polls", "content": [{"type": "polls", "title": "Active Polls"}]}, {"name": "Survey Results", "title": "Survey Results", "description": "View poll and survey results", "icon": "PieChart", "route": "/poll-results", "content": [{"type": "results", "title": "Poll Results"}]}]',
 '["viewOwnProfile", "createPolls"]'),

('comm-knowledge', 'Knowledge Base', 'FAQs, documentation, and company procedures', 'communication', 'BookOpen', 
 '{"features": ["articles", "search", "categories", "favorites"], "layout": "wiki"}',
 '[{"name": "Knowledge Articles", "title": "Knowledge Base", "description": "Company documentation and guides", "icon": "BookOpen", "route": "/knowledge", "content": [{"type": "articles", "title": "Knowledge Articles"}]}, {"name": "FAQs", "title": "Frequently Asked Questions", "description": "Common questions and answers", "icon": "HelpCircle", "route": "/faqs", "content": [{"type": "faq", "title": "FAQs"}]}]',
 '["viewOwnProfile", "editDocs"]');