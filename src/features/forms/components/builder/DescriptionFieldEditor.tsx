import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DescriptionEditorDialog } from "./DescriptionEditorDialog";
import { FormFieldType } from "@/types/forms";

interface FormField {
  field_type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  content?: string;
  is_required: boolean;
  options?: string[];
  field_order: number;
  min_value?: number;
  max_value?: number;
  step_value?: number;
  formula_expression?: string;
  dependent_fields?: string[];
  rating_config?: Record<string, any>;
  scan_config?: Record<string, unknown>;
  media_config?: Record<string, unknown>;
  allow_multiple_selection?: boolean;
  conditional_logic?: {
    enabled: boolean;
    fieldid?: string;
    condition_type?:
      | "equals"
      | "not_equals"
      | "contains"
      | "not_contains"
      | "any_of"
      | "none_of";
    condition_values?: string[];
  };
}

interface DescriptionFieldEditorProps {
  field: FormField;
  onUpdateField: (updates: Partial<FormField>) => void;
}

export function DescriptionFieldEditor({
  field,
  onUpdateField,
}: DescriptionFieldEditorProps) {
  const [showEditor, setShowEditor] = useState(false);

  const handleSaveContent = (content: string) => {
    onUpdateField({ content });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const getPreviewText = () => {
    if (!field.content)
      return 'Click "Edit Content" to add rich text content...';
    const text = stripHtml(field.content);
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Rich Text Content</label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit Content
          </Button>
        </div>

        {/* Content Preview */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {getPreviewText()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DescriptionEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        content={field.content || ""}
        onSave={handleSaveContent}
      />
    </>
  );
}
