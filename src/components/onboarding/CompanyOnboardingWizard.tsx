
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { INDUSTRIES, COMPANY_SIZES, CompanyInfo, Branding } from '@/types/onboarding';
import { 
  Building2, 
  Upload, 
  Palette, 
  CheckSquare, 
  Users, 
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  ShoppingCart,
  Utensils,
  Briefcase,
  Heart
} from 'lucide-react';

interface SelectedSections {
  [key: string]: boolean;
}

const BUSINESS_TEMPLATES = [
  {
    id: 'office',
    name: 'Office & Professional',
    description: 'Perfect for professional services, consulting, and office-based businesses',
    icon: Briefcase,
    sections: ['employees', 'tasks', 'messages', 'forms', 'analytics', 'reports']
  },
  {
    id: 'retail',
    name: 'Retail & Commerce',
    description: 'Designed for retail stores, e-commerce, and product-based businesses',
    icon: ShoppingCart,
    sections: ['employees', 'scheduling', 'inventory', 'tasks', 'analytics', 'expenses']
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Food Service',
    description: 'Built for restaurants, cafes, and food service operations',
    icon: Utensils,
    sections: ['employees', 'scheduling', 'tasks', 'inventory', 'messages', 'expenses']
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Medical',
    description: 'Tailored for healthcare facilities, clinics, and medical practices',
    icon: Heart,
    sections: ['employees', 'scheduling', 'forms', 'messages', 'learning', 'certifications']
  }
];

const AVAILABLE_SECTIONS = [
  { id: 'employees', name: 'Employee Management', icon: Users, description: 'Manage staff profiles and roles' },
  { id: 'scheduling', name: 'Scheduling & Time Tracking', icon: Calendar, description: 'Shift scheduling and time management' },
  { id: 'tasks', name: 'Task Management', icon: CheckSquare, description: 'Project and task tracking' },
  { id: 'messages', name: 'Internal Communication', icon: MessageSquare, description: 'Team messaging and announcements' },
  { id: 'forms', name: 'Digital Forms', icon: FileText, description: 'Custom forms and document management' },
  { id: 'analytics', name: 'Analytics & Reports', icon: BarChart3, description: 'Business insights and reporting' },
  { id: 'inventory', name: 'Inventory Management', icon: Building2, description: 'Stock and inventory tracking' },
  { id: 'expenses', name: 'Expense Management', icon: Building2, description: 'Track and approve expenses' },
  { id: 'learning', name: 'Learning Center', icon: Building2, description: 'Training and development' },
  { id: 'certifications', name: 'Certifications', icon: Building2, description: 'Professional certifications' }
];

interface CompanyOnboardingWizardProps {
  onComplete: (data: { companyInfo: CompanyInfo; branding: Branding; sections: SelectedSections; template: string }) => void;
  onCancel: () => void;
}

export default function CompanyOnboardingWizard({ onComplete, onCancel }: CompanyOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    industry: '',
    size: '',
    description: '',
    website: '',
    phone: ''
  });
  const [branding, setBranding] = useState<Branding>({
    logo: null,
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af'
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSections, setSelectedSections] = useState<SelectedSections>({});

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = BUSINESS_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      const newSections: SelectedSections = {};
      template.sections.forEach(section => {
        newSections[section] = true;
      });
      setSelectedSections(newSections);
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleComplete = () => {
    onComplete({
      companyInfo,
      branding,
      sections: selectedSections,
      template: selectedTemplate
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return companyInfo.name && companyInfo.industry && companyInfo.size;
      case 2:
        return true; // Branding is optional
      case 3:
        return selectedTemplate;
      case 4:
        return Object.values(selectedSections).some(Boolean);
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">FlowForce</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Company Onboarding</h2>
          <p className="text-gray-600 mt-2">Let's set up your business operations platform</p>
          <div className="mt-4 max-w-md mx-auto">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2">Step {currentStep} of {totalSteps}</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {currentStep === 1 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-6 w-6" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Tell us about your company to customize your experience
                  </CardDescription>
                </CardHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name *</Label>
                      <Input
                        id="company-name"
                        value={companyInfo.name}
                        onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry *</Label>
                      <Select value={companyInfo.industry} onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, industry: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company-size">Company Size *</Label>
                      <Select value={companyInfo.size} onValueChange={(value) => setCompanyInfo(prev => ({ ...prev, size: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={companyInfo.website}
                        onChange={(e) => setCompanyInfo(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      value={companyInfo.description}
                      onChange={(e) => setCompanyInfo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of your company and what you do"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-6 w-6" />
                    Branding & Customization
                  </CardTitle>
                  <CardDescription>
                    Customize the look and feel of your FlowForce workspace
                  </CardDescription>
                </CardHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <Button variant="outline" size="sm">
                              Choose File
                            </Button>
                            <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 2MB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          id="primary-color"
                          value={branding.primaryColor}
                          onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={branding.primaryColor}
                          onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          id="secondary-color"
                          value={branding.secondaryColor}
                          onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300"
                        />
                        <Input
                          value={branding.secondaryColor}
                          onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          placeholder="#1e40af"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Choose Your Business Template</CardTitle>
                  <CardDescription>
                    Select a pre-configured template that matches your business type
                  </CardDescription>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BUSINESS_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <template.icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          <p className="text-gray-600 text-sm mt-1">{template.description}</p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {template.sections.map(section => (
                              <Badge key={section} variant="secondary" className="text-xs">
                                {AVAILABLE_SECTIONS.find(s => s.id === section)?.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Customize Your Sections</CardTitle>
                  <CardDescription>
                    Review and adjust the sections enabled for your workspace
                  </CardDescription>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_SECTIONS.map(section => (
                    <div
                      key={section.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSections[section.id]
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <section.icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium">{section.name}</h4>
                          <p className="text-gray-600 text-sm mt-1">{section.description}</p>
                        </div>
                        {selectedSections[section.id] && (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t">
              <div>
                {currentStep > 1 && (
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
              <div>
                {currentStep < totalSteps ? (
                  <Button onClick={handleNext} disabled={!canProceed()}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleComplete} disabled={!canProceed()}>
                    Complete Setup
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
