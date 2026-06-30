import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  X,
  Plus,
  GripVertical,
  Megaphone,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  BookOpen,
  FileText,
  Settings,
  Shield,
  DollarSign,
  Package,
  Clock,
} from "lucide-react";
import {
  CustomSection,
  CustomSectionPage,
  SectionTemplate,
} from "@/hooks/useCustomSections";
import { logger } from "@/utils/logger";

interface SectionEditorProps {
  section?: CustomSection;
  template?: SectionTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectionData: Partial<CustomSection>) => Promise<void>;
}

const iconOptions = {
  Megaphone,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  BookOpen,
  FileText,
  Settings,
  Shield,
  DollarSign,
  Package,
  Clock,
};

const categoryOptions = [
  { value: "communication", label: "Communication" },
  { value: "operations", label: "Operations" },
  { value: "hr", label: "HR & Development" },
  { value: "analytics", label: "Analytics & Reports" },
  { value: "admin", label: "Admin & Setup" },
  { value: "custom", label: "Custom" },
];

const permissionOptions = [
  "viewOwnProfile",
  "viewTeamProfiles",
  "editOwnProfile",
  "editTeamProfiles",
  "manageUsers",
  "createPosts",
  "editPosts",
  "deletePosts",
  "viewOwnTasks",
  "createTasks",
  "editTasks",
  "deleteTasks",
  "viewOwnSchedules",
  "createEvents",
  "manageSchedules",
  "sendMessages",
  "createChannels",
  "manageChannels",
  "createPolls",
  "viewReports",
  "createReports",
  "editDocs",
  "manageSettings",
];

export default function SectionEditor({
  section,
  template,
  isOpen,
  onClose,
  onSave,
}: SectionEditorProps) {
  const [formData, setFormData] = useState<Partial<CustomSection>>({
    name: "",
    description: "",
    icon: "FileText",
    category: "custom",
    path: "",
    permissions: [],
    is_active: true,
    template_config: {},
  });

  const [pages, setPages] = useState<Partial<CustomSectionPage>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name,
        description: section.description,
        icon: section.icon,
        category: section.category,
        path: section.path,
        permissions: section.permissions,
        is_active: section.is_active,
        template_config: section.template_config,
      });
      setPages(section.pages || []);
    } else if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        path: `/${template.name.toLowerCase().replace(/\s+/g, "-")}`,
        permissions: template.defaultpermissions,
        is_active: true,
        template_config: template.config,
      });
      setPages(template.default_pages || []);
    }
  }, [section, template]);

  const handleSubmit = async () => {
    if (!formData.name) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      logger.error("Error saving section:", { error, tags: ["error"] });
    } finally {
      setSaving(false);
    }
  };

  const addPage = () => {
    const newPage: Partial<CustomSectionPage> = {
      name: "New Page",
      title: "New Page",
      description: "",
      icon: "FileText",
      route: `${formData.path}/new-page-${pages.length + 1}`,
      content: [],
      permissions: [],
      is_active: true,
      sort_order: pages.length,
    };
    setPages([...pages, newPage]);
  };

  const removePage = (index: number) => {
    setPages(pages.filter((_, i) => i !== index));
  };

  const updatePage = (index: number, updates: Partial<CustomSectionPage>) => {
    setPages(
      pages.map((page, i) => (i === index ? { ...page, ...updates } : page)),
    );
  };

  const togglePermission = (permission: string) => {
    const current = formData.permissions || [];
    const updated = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    setFormData({ ...formData, permissions: updated });
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent =
      iconOptions[iconName as keyof typeof iconOptions] || FileText;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {section
              ? "Edit Section"
              : template
                ? `Create from ${template.name}`
                : "Create Custom Section"}
          </DialogTitle>
          <DialogDescription>
            Configure your section settings, pages, and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Customer Management"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe what this section is for..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Path *</Label>
                  <Input
                    value={formData.path}
                    onChange={(e) =>
                      setFormData({ ...formData, path: e.target.value })
                    }
                    placeholder="/custom-section"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {Object.keys(iconOptions).map((iconName) => (
                      <Button
                        key={iconName}
                        variant={
                          formData.icon === iconName ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setFormData({ ...formData, icon: iconName })
                        }
                        className="h-10"
                      >
                        {getIconComponent(iconName)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissions</CardTitle>
              <CardDescription>
                Select the permissions required to access this section
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {permissionOptions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={
                        formData.permissions?.includes(permission) || false
                      }
                      onChange={() => togglePermission(permission)}
                      className="rounded"
                    />
                    <Label htmlFor={permission} className="text-sm">
                      {permission}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pages */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Pages</CardTitle>
                  <CardDescription>
                    Configure the pages within this section
                  </CardDescription>
                </div>
                <Button size="sm" onClick={addPage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Page
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pages yet. Add a page to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {pages.map((page, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          {getIconComponent(page.icon || "FileText")}
                          <span className="font-medium">{page.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={page.name}
                          onChange={(e) =>
                            updatePage(index, { name: e.target.value })
                          }
                          placeholder="Page name"
                        />
                        <Input
                          value={page.route}
                          onChange={(e) =>
                            updatePage(index, { route: e.target.value })
                          }
                          placeholder="Route path"
                        />
                      </div>

                      <Textarea
                        value={page.description}
                        onChange={(e) =>
                          updatePage(index, { description: e.target.value })
                        }
                        placeholder="Page description"
                        rows={2}
                        className="mt-3"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Section"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
