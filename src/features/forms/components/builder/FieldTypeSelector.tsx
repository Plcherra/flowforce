import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  FileText,
  AlignLeft,
  Hash,
  ChevronDown,
  CheckCircle,
  Image,
  Calculator,
  ScanLine,
  Calendar,
  MapPin,
  ImageUp,
  Mic,
  Video,
  CheckSquare,
  Upload,
  Star,
  PenTool,
  Sliders,
} from "lucide-react";
import { FormFieldType } from "@/types/forms";

const fieldTypes = [
  { value: "text", label: "Description", icon: "FileText", category: "basic" },
  { value: "formula", label: "Formula", icon: "Calculator", category: "basic" },
  {
    value: "select",
    label: "Dropdown",
    icon: "ChevronDown",
    category: "basic",
  },
  { value: "number", label: "Number", icon: "Hash", category: "basic" },
  {
    value: "textarea",
    label: "Open ended",
    icon: "AlignLeft",
    category: "basic",
  },
  { value: "yes_no", label: "Yes/No", icon: "CheckCircle", category: "basic" },
  { value: "date", label: "Date", icon: "Calendar", category: "basic" },
  {
    value: "number_slider",
    label: "Number Slider",
    icon: "Sliders",
    category: "basic",
  },
  {
    value: "location",
    label: "Location",
    icon: "MapPin",
    category: "location",
  },
  {
    value: "image_upload",
    label: "Image Upload",
    icon: "ImageUp",
    category: "media",
  },
  {
    value: "audio_recording",
    label: "Audio Recording",
    icon: "Mic",
    category: "media",
  },
  {
    value: "video_upload",
    label: "Video Upload",
    icon: "Video",
    category: "media",
  },
  { value: "file", label: "File upload", icon: "Upload", category: "media" },
  {
    value: "scanner",
    label: "Scanner",
    icon: "ScanLine",
    category: "interactive",
  },
  {
    value: "image_selection",
    label: "Image selection",
    icon: "Image",
    category: "interactive",
  },
  {
    value: "signature",
    label: "Signature",
    icon: "PenTool",
    category: "interactive",
  },
  { value: "rating", label: "Rating", icon: "Star", category: "interactive" },
  {
    value: "task",
    label: "Task",
    icon: "CheckSquare",
    category: "interactive",
  },
] as const;

interface FormField {
  field_type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  is_required: boolean;
  options?: string[];
  field_order: number;
  conditional_logic?: {
    enabled: boolean;
  };
}

interface FieldTypeSelectorProps {
  formTitle: string;
  formDescription: string;
  onFormTitleChange: (title: string) => void;
  onFormDescriptionChange: (description: string) => void;
  onAddField: () => void;
  onFieldTypeSelect: (field: FormField) => void;
  fieldsCount: number;
}

const getFieldIcon = (fieldType: string) => {
  const typeConfig = fieldTypes.find((t) => t.value === fieldType);
  const iconName = typeConfig?.icon || "FileText";

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileText,
    AlignLeft,
    Hash,
    ChevronDown,
    CheckCircle,
    Image,
    Calculator,
    ScanLine,
    Calendar,
    MapPin,
    ImageUp,
    Mic,
    Video,
    CheckSquare,
    Upload,
    Star,
    PenTool,
    Sliders,
  };

  const IconComponent = iconMap[iconName] || FileText;
  return <IconComponent className="h-4 w-4" />;
};

const groupFieldsByCategory = () => {
  const categories = {
    basic: fieldTypes.filter((f) => f.category === "basic"),
    media: fieldTypes.filter((f) => f.category === "media"),
    location: fieldTypes.filter((f) => f.category === "location"),
    interactive: fieldTypes.filter((f) => f.category === "interactive"),
  };
  return categories;
};

export default function FieldTypeSelector({
  formTitle,
  formDescription,
  onFormTitleChange,
  onFormDescriptionChange,
  onAddField,
  onFieldTypeSelect,
  fieldsCount,
}: FieldTypeSelectorProps) {
  const createField = (type: any) => {
    return {
      field_type: type.value as FormFieldType,
      label: type.label,
      description: "",
      placeholder: "",
      is_required: false,
      options: [],
      field_order: fieldsCount + 1,
      conditional_logic: {
        enabled: false,
      },
    };
  };

  return (
    <div className="flex-shrink-0 flex flex-col h-full">
      {/* Form Title and Description - Fixed */}
      <div className="mb-4 p-3 border rounded-lg bg-muted/30 flex-shrink-0">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">
              Form Title
            </label>
            <Input
              value={formTitle}
              onChange={(e) => onFormTitleChange(e.target.value)}
              placeholder="Enter form title"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Form Description
            </label>
            <Textarea
              value={formDescription}
              onChange={(e) => onFormDescriptionChange(e.target.value)}
              placeholder="Describe what this form is for..."
              className="mt-1 min-h-[60px]"
            />
          </div>
        </div>
      </div>

      {/* Add Field Button - Fixed */}
      <div className="mb-4 flex-shrink-0">
        <Button onClick={onAddField} className="w-full h-8 text-sm font-medium">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Field Types - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pr-2">
          {/* Basic Fields Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 px-1">
              Basic Fields
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {groupFieldsByCategory().basic.map((type) => (
                <Card
                  key={type.value}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 p-4 hover:border-primary/60 border border-border bg-card hover:bg-primary/8 active:scale-98 min-h-[80px] flex items-center"
                  onClick={() => onFieldTypeSelect(createField(type))}
                >
                  <div className="flex flex-col items-center gap-2 text-center w-full">
                    <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
                      {getFieldIcon(type.value)}
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">
                      {type.label}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Media & Files Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 px-1">
              Media & Files
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {groupFieldsByCategory().media.map((type) => (
                <Card
                  key={type.value}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 p-4 hover:border-primary/60 border border-border bg-card hover:bg-primary/8 active:scale-98 min-h-[80px] flex items-center"
                  onClick={() => onFieldTypeSelect(createField(type))}
                >
                  <div className="flex flex-col items-center gap-2 text-center w-full">
                    <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
                      {getFieldIcon(type.value)}
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">
                      {type.label}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Interactive Fields Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 px-1">
              Interactive Fields
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ...groupFieldsByCategory().location,
                ...groupFieldsByCategory().interactive,
              ].map((type) => (
                <Card
                  key={type.value}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 p-4 hover:border-primary/60 border border-border bg-card hover:bg-primary/8 active:scale-98 min-h-[80px] flex items-center"
                  onClick={() => onFieldTypeSelect(createField(type))}
                >
                  <div className="flex flex-col items-center gap-2 text-center w-full">
                    <div className="p-2.5 rounded-lg bg-primary/20 text-primary">
                      {getFieldIcon(type.value)}
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">
                      {type.label}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
