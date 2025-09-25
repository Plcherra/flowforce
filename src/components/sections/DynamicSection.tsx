import React, { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useCustomSections } from '@/hooks/useCustomSections';
import { LoadingSpinner } from '@/components/ui/loading-states';
import CompanyUpdatesSection from './CompanyUpdatesSection';
import EventsIndex from '@/sections/events/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCan } from '@/hooks/useCan';
import { SectionConfigurationWizard } from '@/components/sections/SectionConfigurationWizard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import other specific section components as needed
// import EmployeeDirectorySection from './EmployeeDirectorySection';
// import EventsCalendarSection from './EventsCalendarSection';

interface DynamicSectionProps {
  sectionPath?: string;
}

export default function DynamicSection({ sectionPath }: DynamicSectionProps) {
  const { path } = useParams();
  const navigate = useNavigate();
  const targetPath = sectionPath || path;
  const { sections, loading } = useCustomSections();

  if (loading) {
    return <LoadingSpinner text="Loading section..." />;
  }

  const section = sections.find(s => s.path === `/${targetPath}`);

  if (!section) {
    return <Navigate to="/dashboard" replace />;
  }

  // Route to specific section components based on template_id, path or name
  // Provide broad detection for event-like sections so sections created from templates
  // render the dedicated events UI even if the DB doesn't contain page rows yet.
  const templateKey = (section.template_id || '').toString().toLowerCase();
  const sectionRoute = (section.path || '').toString().toLowerCase();
  const sectionName = (section.name || '').toString().toLowerCase();

  // If any of the identifying fields contains "event" (covers '/events', '/updates/events'), render EventsIndex.
  if (templateKey.includes('event') || sectionRoute.includes('event') || sectionName.includes('event')) {
    return <EventsIndex />;
  }

  // Route based on path for specific sections
  switch (templateKey || sectionRoute || sectionName) {
    case 'company-updates':
    case '/updates':
      return <CompanyUpdatesSection />;

    // Add more specific section components here
    case 'employee-directory':
    case '/directory':
      // Route the Employee Directory section to the dedicated Employees page
      // to provide the full table, filters and export features.
      return <Navigate to="/employees" replace={false} />;

    default:
      // Fallback to generic section renderer
      return <GenericSectionRenderer section={section} />;
  }
}

// Generic section renderer for sections without specific components
function GenericSectionRenderer({ section }: { section: any }) {
  const { can } = useCan();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);

  const isEventsSection = (() => {
    try {
      const tk = (section.template_id || '').toString().toLowerCase();
      const route = (section.path || '').toString().toLowerCase();
      const name = (section.name || '').toString().toLowerCase();
      return tk.includes('event') || route.includes('event') || name.includes('event');
    } catch (e) {
      return false;
    }
  })();

  const hasPages = section?.custom_section_pages && section.custom_section_pages.length > 0;

  const getIcon = () => {
    // Handle emoji icons (single character)
    if (section.icon && section.icon.length === 1) {
      return <span className="text-base">{section.icon}</span>;
    }
    
    // Handle Lucide icon names
    const IconComponent = (Icons as any)[section.icon];
    if (IconComponent) {
      return <IconComponent className="h-4 w-4" />;
    }
    
    // Fallback to FileText icon
    return <Icons.FileText className="h-4 w-4" />;
  };

  const getSectionType = () => {
    if (isEventsSection) return "Events";
    if (section.template_id?.toString() === "2") return "Company Updates";
    return "Custom Section";
  };

  const getSectionTypeColor = (type: string) => {
    switch (type) {
      case 'Events': return 'bg-blue-100 text-blue-800';
      case 'Company Updates': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSectionType = () => {
    const sectionType = getSectionType();
    return (
      <Badge className={getSectionTypeColor(sectionType)}>
        {sectionType}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Section Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                {getIcon()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{section.name || 'Unnamed Section'}</h1>
                  {renderSectionType()}
                </div>
                {section.description && (
                  <p className="text-muted-foreground mt-1">{section.description}</p>
                )}
              </div>
            </div>
            
            {can('systemSettings') && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/sections-permissions')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowWizard(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Section
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasPages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.custom_section_pages.map((page: any, index: number) => (
              <Card key={page.id || index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {page.icon && (Icons as any)[page.icon] ? 
                        React.createElement((Icons as any)[page.icon], { className: "h-5 w-5 text-primary" }) :
                        <Icons.FileText className="h-5 w-5 text-primary" />
                      }
                      <CardTitle className="text-lg">{page.title || page.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{page.content?.length || 0} items</Badge>
                  </div>
                  {page.description && (
                    <CardDescription>{page.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Navigate to this page to view and manage its content.
                  </p>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm">
                      View Page
                    </Button>
                    {can('systemSettings') && (
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
                {can('systemSettings') 
                  ? " You can add pages and configure this section to get started."
                  : " Contact your administrator to set up this section."
                }
              </CardDescription>
            </CardHeader>
            {can('systemSettings') && (
              <CardContent className="text-center">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add pages, customize the layout, and configure content for this section.
                  </p>
                  <Button onClick={() => setShowWizard(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Configure Section
                  </Button>
                </div>
              </CardContent>
            )}
            {!can('systemSettings') && (
              <CardContent className="text-center">
                {section.description ? (
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Contact your administrator to set up this section.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {/* Configure / Add Pages Wizard */}
      <SectionConfigurationWizard
        section={section}
        open={showWizard}
        onOpenChange={setShowWizard}
        onSave={async (updates: any) => {
          try {
            // Update section meta
            await supabase
              .from('custom_sections')
              .update({
                name: updates.name ?? section.name,
                description: updates.description ?? section.description,
                icon: updates.icon ?? section.icon,
                permissions: updates.permissions ?? section.permissions,
              })
              .eq('id', section.id);

            // Insert missing pages
            const { data: existingPages } = await supabase
              .from('custom_section_pages')
              .select('id, route')
              .eq('section_id', section.id);
            const existingRoutes = new Set((existingPages || []).map((p: any) => p.route));
            const pagesToInsert = (updates.pages || [])
              .filter((p: any) => !existingRoutes.has(p.route))
              .map((p: any, idx: number) => ({
                section_id: section.id,
                name: p.name || p.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                title: p.title || 'Page',
                description: p.description || null,
                icon: p.icon || 'FileText',
                route: p.route || `${section.path}/${(p.title || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                content: Array.isArray(p.content) ? p.content : [],
                permissions: Array.isArray(p.permissions) ? p.permissions : ['viewOwnProfile'],
                sort_order: idx,
              }));
            if (pagesToInsert.length > 0) {
              await supabase.from('custom_section_pages').insert(pagesToInsert);
            }
            toast({ title: 'Section updated' });
          } catch (e) {
            console.error('Failed to configure section', e);
            toast({ title: 'Failed to configure section', variant: 'destructive' });
          }
        }}
      />
    </div>
  );
}