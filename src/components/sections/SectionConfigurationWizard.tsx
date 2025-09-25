import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Plus, 
  Trash2, 
  Eye,
  Settings,
  Users,
  Lock
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { QUICK_TEMPLATES } from '@/data/sectionTemplates';

interface SectionConfigurationWizardProps {
  section: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: any) => void;
}

const WIZARD_STEPS = [
  { id: 'overview', title: 'Overview', icon: Eye },
  { id: 'pages', title: 'Pages & Content', icon: Settings },
  { id: 'permissions', title: 'Permissions', icon: Lock },
  { id: 'review', title: 'Review & Launch', icon: Check }
];

const PERMISSION_OPTIONS = [
  { id: 'viewOwnProfile', label: 'View Own Profile', description: 'Users can view their own profile' },
  { id: 'viewAllProfiles', label: 'View All Profiles', description: 'Users can view all user profiles' },
  { id: 'manageTeam', label: 'Manage Team', description: 'Users can manage team members' },
  { id: 'manageCompany', label: 'Manage Company', description: 'Full company management access' },
  { id: 'viewReports', label: 'View Reports', description: 'Users can view reports and analytics' },
  { id: 'manageSettings', label: 'Manage Settings', description: 'Users can modify system settings' }
];

export function SectionConfigurationWizard({ 
  section, 
  open, 
  onOpenChange, 
  onSave 
}: SectionConfigurationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: section?.name || '',
    description: section?.description || '',
    icon: section?.icon || 'FileText',
    pages: (section?.pages && section.pages.length > 0 ? section.pages : []),
    permissions: section?.permissions || ['viewOwnProfile'],
    isActive: true
  });

  // Suggested pages from template (DB id or local quick template id)
  const suggestedPages = useMemo(() => {
    const tplId = section?.template_id;
    if (!tplId) return [] as any[];
    const tpl = QUICK_TEMPLATES.find(t => t.id === tplId);
    return (tpl?.config?.pages || []) as any[];
  }, [section?.template_id]);

  // If there are no existing pages and we have suggestions, pre-fill with suggestions once
  const hasPrefilled = useMemo(() => formData.pages && formData.pages.length > 0, [formData.pages]);
  React.useEffect(() => {
    if (!hasPrefilled && suggestedPages.length > 0) {
      setFormData(prev => ({
        ...prev,
        pages: suggestedPages.map((p: any) => ({
          name: p.name,
          title: p.title,
          description: p.description || '',
          icon: p.icon || 'FileText',
          route: p.route,
          content: p.content || [],
          permissions: p.permissions || ['viewOwnProfile']
        }))
      }));
    }
  }, [hasPrefilled, suggestedPages]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const addPage = () => {
    setFormData(prev => ({
      ...prev,
      pages: [...prev.pages, {
        name: 'new-page',
        title: 'New Page',
        description: '',
        icon: 'FileText',
        route: '/new-page',
        content: [],
        permissions: ['viewOwnProfile']
      }]
    }));
  };

  const removePage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pages: prev.pages.filter((_, i) => i !== index)
    }));
  };

  const updatePage = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      pages: prev.pages.map((page, i) => 
        i === index ? { ...page, ...updates } : page
      )
    }));
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <Icons.FileText className="h-4 w-4" />;
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Section Overview</h3>
              <p className="text-muted-foreground">
                Configure the basic settings for your section
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Section Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter section name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this section is for"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 'pages':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Pages & Content</h3>
              <p className="text-muted-foreground">Add pages to organize content within this section</p>
            </div>
            
            {/* Suggested pages from template */}
            {suggestedPages.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Suggested Pages</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestedPages.map((p: any, index: number) => {
                    const included = formData.pages.some((pg: any) => pg.route === p.route);
                    return (
                      <Card key={index} className={included ? 'border-primary/50' : ''}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{p.title}</CardTitle>
                            <Badge variant="outline" className="text-xs">{p.icon || 'Page'}</Badge>
                          </div>
                          {p.description && <CardDescription>{p.description}</CardDescription>}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex justify-end">
                            {included ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  pages: prev.pages.filter((pg: any) => pg.route !== p.route)
                                }))}
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  pages: [...prev.pages, {
                                    name: p.name,
                                    title: p.title,
                                    description: p.description || '',
                                    icon: p.icon || 'FileText',
                                    route: p.route,
                                    content: p.content || [],
                                    permissions: p.permissions || ['viewOwnProfile']
                                  }]
                                }))}
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 mt-4">
              {formData.pages.map((page, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={page.title}
                        onChange={(e) => updatePage(index, { title: e.target.value })}
                        className="font-medium border-0 p-0 h-auto focus-visible:ring-0"
                        placeholder="Page title"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removePage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={page.description}
                      onChange={(e) => updatePage(index, { description: e.target.value })}
                      placeholder="Page description"
                      rows={2}
                    />
                  </CardContent>
                </Card>
              ))}
              
              <Button 
                variant="outline" 
                onClick={addPage}
                className="w-full border-dashed border-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Access Permissions</h3>
              <p className="text-muted-foreground">
                Choose who can access and manage this section
              </p>
            </div>
            
            <div className="space-y-3">
              {PERMISSION_OPTIONS.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={permission.id}
                    checked={formData.permissions.includes(permission.id)}
                    onCheckedChange={() => togglePermission(permission.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={permission.id} className="font-medium">
                      {permission.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {permission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Review & Launch</h3>
              <p className="text-muted-foreground">
                Review your section configuration before launching
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getIcon(formData.icon)}
                  </div>
                  <div>
                    <CardTitle>{formData.name}</CardTitle>
                    <CardDescription>{formData.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Pages ({formData.pages.length})</h4>
                  <div className="space-y-1">
                    {formData.pages.map((page, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {page.title}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Permissions ({formData.permissions.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {formData.permissions.map((permission) => {
                      const perm = PERMISSION_OPTIONS.find(p => p.id === permission);
                      return (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {perm?.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Section</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {WIZARD_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${isActive ? 'bg-primary text-primary-foreground' : 
                    isCompleted ? 'bg-green-500 text-white' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  <StepIcon className="h-4 w-4" />
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Save & Launch
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
