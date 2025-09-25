import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { useForms } from '@/hooks/useForms';
import { toast } from '@/hooks/use-toast';
import { FormFieldValidationRules } from '@/types/api';
import { FormFieldType } from '@/types/forms';
import { supabase } from '@/integrations/supabase/client';

// Import new components
import FieldTypeSelector from './builder/FieldTypeSelector';
import FieldEditor from './builder/FieldEditor';
import FormPreview from './builder/FormPreview';

interface FormField {
  field_type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  is_required: boolean;
  options?: string[];
  validation_rules?: FormFieldValidationRules;
  field_order: number;
  // Enhanced properties for new field types
  min_value?: number;
  max_value?: number;
  step_value?: number;
  formula_expression?: string;
  dependent_fields?: string[];
  rating_config?: Record<string, any>;
  scan_config?: Record<string, any>;
  media_config?: Record<string, any>;
  // Conditional field properties
  conditional_logic?: {
    enabled: boolean;
    field_id?: string;
    condition_type?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'none_of';
    condition_values?: string[];
  };
}

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  initialTitle?: string;
  initialDescription?: string;
}

export default function FormBuilderDialog({ 
  open, 
  onOpenChange, 
  formId, 
  initialTitle = "New Form", 
  initialDescription = "" 
}: FormBuilderDialogProps) {
  const { getFormFields, saveFormFields } = useForms();
  const [fields, setFields] = useState<FormField[]>([]);
  const [formTitle, setFormTitle] = useState(initialTitle);
  const [formDescription, setFormDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && formId) {
      loadFormFields();
    }
  }, [open, formId]);

  const loadFormFields = async () => {
    setLoading(true);
    const { data, error } = await getFormFields(formId);
    if (!error && data) {
      const formFields = data.map(field => ({
        field_type: field.field_type,
        label: field.label,
        description: field.description || '',
        placeholder: field.placeholder || '',
        is_required: field.is_required || false,
        options: Array.isArray(field.options) ? field.options.map(opt => String(opt)) : [],
        validation_rules: (field.validation_rules as FormFieldValidationRules) || {},
        field_order: field.field_order,
        conditional_logic: {
          enabled: false,
        },
      }));
      setFields(formFields);
    }
    setLoading(false);
  };

  const addField = () => {
    setFields([...fields, {
      field_type: 'text',
      label: '',
      description: '',
      placeholder: '',
      is_required: false,
      options: [],
      validation_rules: {},
      field_order: fields.length + 1,
      conditional_logic: {
        enabled: false,
      },
    }]);
  };

  const addFieldWithType = (field: FormField) => {
    setFields([...fields, field]);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    const reorderedFields = newFields.map((field, i) => ({
      ...field,
      field_order: i + 1,
    }));
    setFields(reorderedFields);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newFields = [...fields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    
    // Update field_order for all fields
    const reorderedFields = newFields.map((field, i) => ({
      ...field,
      field_order: i + 1,
    }));
    
    setFields(reorderedFields);
  };

  const handleSave = async () => {
    if (fields.some(field => !field.label.trim())) {
      toast({
        title: "Error",
        description: "All fields must have a label",
        variant: "destructive",
      });
      return;
    }

    if (!formTitle.trim()) {
      toast({
        title: "Error", 
        description: "Form title is required",
        variant: "destructive",
      });
      return;
    }

    const { error: formError } = await supabase
      .from('forms')
      .update({
        title: formTitle,
        description: formDescription || undefined
      })
      .eq('id', formId);
      
    if (formError) {
      toast({
        title: "Error",
        description: "Failed to update form details",
        variant: "destructive",
      });
      return;
    }

    const fieldsToSave = fields.map((field, index) => ({
      field_type: field.field_type as FormFieldType,
      label: field.label,
      description: field.description || '',
      placeholder: field.placeholder || '',
      is_required: field.is_required,
      options: field.options || [],
      validation_rules: field.validation_rules || {},
      field_order: index + 1,
    }));

    const { error } = await saveFormFields(formId, fieldsToSave as any);
    if (!error) {
      toast({
        title: "Success",
        description: "Form saved successfully",
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Form Editor</DialogTitle>
          <DialogDescription>
            Add and configure fields for your form with advanced features like conditional logic.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 flex-1 flex items-center justify-center">
            <div className="space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-muted-foreground">Loading form fields...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <ResizablePanelGroup direction="horizontal" className="h-full min-h-[600px]">
              <ResizablePanel defaultSize={20} minSize={15}>
                <div className="h-full pr-4">
                  <FieldTypeSelector
                    formTitle={formTitle}
                    formDescription={formDescription}
                    onFormTitleChange={setFormTitle}
                    onFormDescriptionChange={setFormDescription}
                    onAddField={addField}
                    onFieldTypeSelect={addFieldWithType}
                    fieldsCount={fields.length}
                  />
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full px-4">
                  <FieldEditor
                    fields={fields}
                    onUpdateField={updateField}
                    onRemoveField={removeField}
                    onMoveField={moveField}
                  />
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-full pl-4">
                  <FormPreview
                    formTitle={formTitle}
                    formDescription={formDescription}
                    fields={fields}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ScrollArea>
        )}

        <div className="flex justify-between items-center pt-6 mt-6 border-t bg-background flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" disabled={fields.length === 0}>
              Save as Draft
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-primary hover:bg-primary/90"
              disabled={fields.length === 0 || !formTitle.trim()}
            >
              Save & Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}