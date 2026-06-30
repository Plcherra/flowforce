import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Palette,
  Layout,
  Save,
  Eye,
  Building2,
  Users,
  Settings,
} from "lucide-react";
import {
  CustomTemplate,
  CustomBranding,
  CustomSection,
  CustomRole,
} from "@/types/customTemplate";
import BrandingCustomizer from "./BrandingCustomizer";
import SectionBuilder from "./SectionBuilder";

interface CustomTemplateBuilderProps {
  template: Partial<CustomTemplate>;
  onTemplateChange: (template: Partial<CustomTemplate>) => void;
  onSave: () => void;
  onPreview: () => void;
}

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Legal",
  "Consulting",
  "Non-profit",
  "Hospitality",
  "Transportation",
  "Media",
  "Government",
  "Other",
];

const _companySizes = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

export default function CustomTemplateBuilder({
  template,
  onTemplateChange,
  onSave,
  onPreview,
}: CustomTemplateBuilderProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const updateTemplate = (updates: Partial<CustomTemplate>) => {
    onTemplateChange({ ...template, ...updates });
  };

  const updateBranding = (branding: CustomBranding) => {
    updateTemplate({ branding });
  };

  const _updateSections = (sections: CustomSection[]) => {
    updateTemplate({ sections });
  };

  const _handleCompanySizeChange = (size: string, checked: boolean) => {
    const currentSizes = template.companySize || [];
    const newSizes = checked
      ? [...currentSizes, size]
      : currentSizes.filter((s) => s !== size);
    updateTemplate({ companySize: newSizes });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Create Custom Template</h2>
          <p className="text-muted-foreground">
            Build a custom template for your business needs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">
            <Building2 className="h-4 w-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
              <CardDescription>
                Basic details about your custom template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={template.name || ""}
                    onChange={(e) => updateTemplate({ name: e.target.value })}
                    placeholder="e.g., Custom Retail Template"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={template.industry || ""}
                    onValueChange={(value) =>
                      updateTemplate({ industry: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={template.description || ""}
                  onChange={(e) =>
                    updateTemplate({ description: e.target.value })
                  }
                  placeholder="Describe what this template is designed for..."
                  rows={3}
                />
              </div>

              {/* Company size removed - already collected in step 1 */}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={template.isPublic || false}
                    onCheckedChange={(checked) =>
                      updateTemplate({ isPublic: checked as boolean })
                    }
                  />
                  <Label htmlFor="isPublic">Make this template public</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Public templates can be used by other companies as a starting
                  point
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <BrandingCustomizer
            branding={
              template.branding || {
                primaryColor: "#3b82f6",
                secondaryColor: "#1e40af",
                accentColor: "#10b981",
                fontFamily: "Inter, sans-serif",
                headerStyle: "modern",
                sidebarStyle: "expanded",
                cardStyle: "rounded",
                backgroundPattern: "none",
              }
            }
            onBrandingChange={updateBranding}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
