import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  X, 
  GripVertical, 
  MessageSquare, 
  Cog, 
  Users, 
  BarChart3, 
  Shield,
  Calendar,
  FileText,
  ShoppingCart,
  DollarSign,
  Award,
  BookOpen
} from 'lucide-react';
import { CustomSection, CustomPage } from '@/types/customTemplate';

interface SectionBuilderProps {
  sections: CustomSection[];
  onSectionsChange: (sections: CustomSection[]) => void;
}

const sectionIcons = {
  MessageSquare: MessageSquare,
  Calendar: Calendar,
  FileText: FileText,
  Users: Users,
  ShoppingCart: ShoppingCart,
  DollarSign: DollarSign,
  BarChart3: BarChart3,
  Award: Award,
  BookOpen: BookOpen,
  Cog: Cog,
  Shield: Shield
};

const sectionCategories = [
  { value: 'communication', label: 'Communication' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'HR & Development' },
  { value: 'analytics', label: 'Analytics & Reports' },
  { value: 'admin', label: 'Admin & Setup' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' }
];

export default function SectionBuilder({ sections, onSectionsChange }: SectionBuilderProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [newSection, setNewSection] = useState<Partial<CustomSection>>({
    name: '',
    description: '',
    icon: 'FileText',
    category: 'custom',
    pages: [],
    permissions: [],
    isDefault: false,
    isActive: true
  });

  const addSection = () => {
    if (!newSection.name) return;

    const section: CustomSection = {
      id: Date.now().toString(),
      name: newSection.name,
      description: newSection.description || '',
      icon: newSection.icon || 'FileText',
      category: newSection.category as any || 'custom',
      pages: [],
      permissions: newSection.permissions || [],
      isDefault: false,
      isActive: true
    };

    onSectionsChange([...sections, section]);
    setNewSection({
      name: '',
      description: '',
      icon: 'FileText',
      category: 'custom',
      pages: [],
      permissions: [],
      isDefault: false,
      isActive: true
    });
  };

  const removeSection = (sectionId: string) => {
    onSectionsChange(sections.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, updates: Partial<CustomSection>) => {
    onSectionsChange(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  const addPageToSection = (sectionId: string) => {
    const newPage: CustomPage = {
      id: Date.now().toString(),
      name: 'New Page',
      title: 'New Page',
      description: 'A custom page',
      icon: 'FileText',
      route: `/custom-page-${Date.now()}`,
      content: [],
      permissions: [],
      isActive: true
    };

    updateSection(sectionId, {
      pages: [...(sections.find(s => s.id === sectionId)?.pages || []), newPage]
    });
  };

  const removePageFromSection = (sectionId: string, pageId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection(sectionId, {
        pages: section.pages.filter(p => p.id !== pageId)
      });
    }
  };

  const IconComponent = ({ iconName }: { iconName: string }) => {
    const Icon = sectionIcons[iconName as keyof typeof sectionIcons] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Build Custom Sections</h3>
        <p className="text-muted-foreground">
          Create custom sections and pages that match your business needs
        </p>
      </div>

      {/* Add New Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Section
          </CardTitle>
          <CardDescription>
            Create a new section for your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Section Name</Label>
              <Input
                value={newSection.name}
                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                placeholder="e.g., Customer Management"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={newSection.category === 'other' ? 'other' : newSection.category} 
                onValueChange={(value) => {
                  if (value === 'other') {
                    setNewSection({ ...newSection, category: 'other' });
                    setCustomCategory('');
                  } else {
                    setNewSection({ ...newSection, category: value as any });
                    setCustomCategory('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                  {sectionCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newSection.category === 'other' && (
                <Input
                  placeholder="Enter custom category name"
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setNewSection({ ...newSection, category: e.target.value as any });
                  }}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={newSection.description}
              onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
              placeholder="Describe what this section is for..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {Object.keys(sectionIcons).map((iconName) => (
                <Button
                  key={iconName}
                  variant={newSection.icon === iconName ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewSection({ ...newSection, icon: iconName })}
                  className="h-10"
                >
                  <IconComponent iconName={iconName} />
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={addSection} disabled={!newSection.name}>
            Add Section
          </Button>
        </CardContent>
      </Card>

      {/* Existing Sections */}
      <div className="space-y-4">
        <h4 className="font-medium">Your Sections ({sections.length})</h4>
        
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <IconComponent iconName={section.icon} />
                  <div>
                    <CardTitle className="text-lg">{section.name}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {sectionCategories.find(c => c.value === section.category)?.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {editingSection === section.id && (
              <CardContent className="border-t">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={section.name}
                        onChange={(e) => updateSection(section.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={section.category === 'other' ? 'other' : section.category} 
                        onValueChange={(value) => {
                          if (value === 'other') {
                            updateSection(section.id, { category: 'other' });
                          } else {
                            updateSection(section.id, { category: value as any });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                          {sectionCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {section.category === 'other' && (
                        <Input
                          placeholder="Enter custom category name"
                          value={typeof section.category === 'string' && section.category !== 'other' ? section.category : ''}
                          onChange={(e) => updateSection(section.id, { category: e.target.value })}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={section.description}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <Separator />

                  {/* Pages in Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pages in this Section</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPageToSection(section.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Page
                      </Button>
                    </div>

                    {section.pages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No pages yet. Add a page to get started.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {section.pages.map((page) => (
                          <div key={page.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <IconComponent iconName={page.icon} />
                              <span className="text-sm font-medium">{page.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {page.route}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePageFromSection(section.id, page.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {sections.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">No custom sections yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Start by creating your first custom section above
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
