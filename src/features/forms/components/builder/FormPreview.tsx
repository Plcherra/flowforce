import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormFieldType } from "@/types/forms";
import { FileText } from "lucide-react";

// Import field preview components
import { DescriptionFieldPreview } from "../fields/DescriptionField";
import { FormulaFieldPreview } from "../fields/FormulaField";
import { NumberSliderFieldPreview } from "../fields/NumberSliderField";
import { YesNoFieldPreview } from "../fields/YesNoField";
import { LocationFieldPreview } from "../fields/LocationField";
import { ImageUploadFieldPreview } from "../fields/ImageUploadField";
import { VideoUploadFieldPreview } from "../fields/VideoUploadField";
import { AudioRecordingFieldPreview } from "../fields/AudioRecordingField";
import { FileUploadFieldPreview } from "../fields/FileUploadField";
import { SignatureFieldPreview } from "../fields/SignatureField";
import { RatingFieldPreview } from "../fields/RatingField";
import { ScannerFieldPreview } from "../fields/ScannerField";
import { TaskFieldPreview } from "../fields/TaskField";
import { ImageSelectionFieldPreview } from "../fields/ImageSelectionField";

interface FormField {
  field_type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  is_required: boolean;
  options?: string[];
  allow_multiple_selection?: boolean;
  conditional_logic?: {
    enabled: boolean;
    fieldid?: string;
    condition_type?: string;
    condition_values?: string[];
  };
}

interface FormPreviewProps {
  formTitle: string;
  formDescription: string;
  fields: FormField[];
}

const getFieldIcon = (_fieldType: string) => {
  return <FileText className="h-4 w-4" />;
};

export default function FormPreview({
  formTitle,
  formDescription,
  fields,
}: FormPreviewProps) {
  const isFieldVisible = (field: FormField, fieldIndex: number) => {
    if (!field.conditional_logic?.enabled) return true;

    const {
      fieldid,
      condition_type,
    } = field.conditional_logic;
    if (!fieldid || !condition_type) return true;

    // Find the referenced field by its temporary ID (we'll use the field order as ID for now)
    const referencedFieldIndex = parseInt(fieldid) - 1;
    if (referencedFieldIndex < 0 || referencedFieldIndex >= fieldIndex)
      return true;

    // This is just for preview - in actual form we'd check against submitted values
    // For now, we'll show the field if conditions exist (preview purposes)
    return true;
  };

  const renderFieldPreview = (field: FormField, index: number) => {
    const commonProps = {
      label: field.label || `Field ${index + 1}`,
      description: field.description,
      required: field.is_required,
      className: "mb-4",
    };

    switch (field.field_type) {
      case "description":
        return <DescriptionFieldPreview {...commonProps} />;
      case "formula":
        return <FormulaFieldPreview {...commonProps} />;
      case "number_slider":
        return <NumberSliderFieldPreview {...commonProps} />;
      case "yes_no":
        return <YesNoFieldPreview {...commonProps} variant="cards" />;
      case "location":
        return <LocationFieldPreview {...commonProps} />;
      case "image_upload":
        return <ImageUploadFieldPreview {...commonProps} />;
      case "video_upload":
        return <VideoUploadFieldPreview {...commonProps} />;
      case "audio_recording":
        return <AudioRecordingFieldPreview {...commonProps} />;
      case "file_upload":
        return <FileUploadFieldPreview {...commonProps} />;
      case "signature":
        return <SignatureFieldPreview {...commonProps} />;
      case "rating":
        return <RatingFieldPreview {...commonProps} />;
      case "scanner":
        return <ScannerFieldPreview {...commonProps} />;
      case "task":
        return <TaskFieldPreview {...commonProps} />;
      case "image_selection":
        return <ImageSelectionFieldPreview {...commonProps} />;
      case "text":
      case "email":
      case "phone":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <Input
              type={
                field.field_type === "email"
                  ? "email"
                  : field.field_type === "phone"
                    ? "tel"
                    : "text"
              }
              placeholder={field.placeholder || "Enter your response..."}
              className="mt-2"
            />
          </div>
        );
      case "textarea":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <Textarea
              placeholder={field.placeholder || "Enter your response..."}
              className="mt-2"
            />
          </div>
        );
      case "number":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <Input
              type="number"
              placeholder={field.placeholder || "Enter a number"}
              className="mt-2"
            />
          </div>
        );
      case "select":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <div className="mt-3 space-y-3">
              {field.allow_multiple_selection ? (
                // Multiple selection - render as checkboxes
                field.options?.map((option, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox id={`field-${index}-option-${i}`} />
                    <Label
                      htmlFor={`field-${index}-option-${i}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {option}
                    </Label>
                  </div>
                ))
              ) : (
                // Single selection - render as radio buttons
                <RadioGroup defaultValue="" className="space-y-2">
                  {field.options?.map((option, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem
                        value={option}
                        id={`field-${index}-option-${i}`}
                      />
                      <Label
                        htmlFor={`field-${index}-option-${i}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>
        );
      case "date":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <Input type="date" className="mt-2" />
          </div>
        );
      case "datetime":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <Input type="datetime-local" className="mt-2" />
          </div>
        );
      case "radio":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <div className="mt-2 space-y-2">
              {field.options?.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-4 h-4 border border-input rounded-full"></div>
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "checkbox":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <div className="mt-2 space-y-2">
              {field.options?.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-4 h-4 border border-input rounded"></div>
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "file":
        return (
          <div className={commonProps.className}>
            <label className="text-sm font-medium">{commonProps.label}</label>
            {commonProps.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {commonProps.description}
              </p>
            )}
            <Input type="file" className="mt-2" />
          </div>
        );
      default:
        return (
          <Card className={`${commonProps.className} border-dashed`}>
            <CardContent className="p-4 text-center">
              {getFieldIcon(field.field_type)}
              <p className="text-sm text-muted-foreground mt-2">
                {commonProps.label} - Preview not available yet
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="w-80 border-l pl-6 flex-shrink-0">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Live Preview</h3>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {fields.length} fields
          </div>
        </div>
        <div className="space-y-4">
          {/* Form title and description preview */}
          <div className="space-y-2 pb-4 border-b">
            <h2 className="text-xl font-bold">{formTitle || "Form Title"}</h2>
            {formDescription && (
              <p className="text-muted-foreground text-sm">{formDescription}</p>
            )}
          </div>

          {fields.map((field, index) => (
            <div
              key={index}
              className={isFieldVisible(field, index) ? "" : "opacity-50"}
            >
              {renderFieldPreview(field, index)}
              {field.conditional_logic?.enabled && (
                <div className="text-xs text-muted-foreground mt-1 italic flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  Conditional field - will show when conditions are met
                </div>
              )}
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-muted flex items-center justify-center">
                📝
              </div>
              <p className="text-sm">
                Preview will appear here as you add fields
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
