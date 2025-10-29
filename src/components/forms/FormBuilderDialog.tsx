import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForms } from '@/hooks/useForms';
import { useToast } from '@/hooks/use-toast';
import { useFormSchemaStore, useFormSchema } from '@/stores/useFormSchemaStore';
import FormFieldLibrary, { type FieldTemplate } from '@/components/forms/editor/FormFieldLibrary';
import FormEditorPanel from '@/components/forms/editor/FormEditorPanel';
import FormLivePreview from '@/components/forms/editor/FormLivePreview';
import type { FormField } from '@/types/forms';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';
import { Loader2 } from 'lucide-react';

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  initialTitle?: string;
  initialDescription?: string;
}

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export default function FormBuilderDialog({
  open,
  onOpenChange,
  formId,
  initialTitle = 'New Form',
  initialDescription = '',
}: FormBuilderDialogProps) {
  const { getFormFields, saveFormFields } = useForms();
  const { toast } = useToast();

  const schema = useFormSchema();
  const activeSectionId = useFormSchemaStore((state) => state.activeSectionId);
  const loadSchema = useFormSchemaStore((state) => state.loadSchema);
  const addField = useFormSchemaStore((state) => state.addField);
  const resetSchema = useFormSchemaStore((state) => state.reset);

  const [formTitle, setFormTitle] = useState(initialTitle);
  const [formDescription, setFormDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      resetSchema();
    }
  }, [open, resetSchema]);

  useEffect(() => {
    setFormTitle(initialTitle);
    setFormDescription(initialDescription);
  }, [initialTitle, initialDescription]);

  const initialise = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getFormFields(formId);
    if (error) {
      toast({ title: 'Error', description: 'Unable to load form fields', variant: 'destructive' });
      setLoading(false);
      return;
    }

    type FormFieldRow = Tables<'form_fields'>;
    const rows = ((data ?? []) as FormFieldRow[]).sort(
      (a, b) => (a.field_order ?? 0) - (b.field_order ?? 0),
    );

    loadSchema({
      id: formId,
      title: initialTitle ?? 'Untitled form',
      sections: [
        {
          id: randomId(),
          title: 'Main section',
          fields: rows.map((row) => ({
            id: row.id ?? randomId(),
            type: row.field_type as FormField['type'],
            label: row.label ?? 'Untitled field',
            placeholder: row.placeholder ?? undefined,
            required: Boolean(row.is_required),
            options: Array.isArray(row.options) ? row.options.map((option) => String(option)) : [],
            validation: (row.validation_rules as FormField['validation']) ?? undefined,
            min_value: row.min_value ?? undefined,
            max_value: row.max_value ?? undefined,
            step_value: row.step_value ?? undefined,
            formula_expression: row.formula_expression ?? undefined,
            dependent_fields: Array.isArray(row.dependent_fields)
              ? (row.dependent_fields as string[])
              : undefined,
            rating_config: (row.rating_config as FormField['rating_config']) ?? undefined,
            scan_config: (row.scan_config as FormField['scan_config']) ?? undefined,
            media_config: (row.media_config as FormField['media_config']) ?? undefined,
            content: undefined,
          })),
        },
      ],
      formulas: [],
      validations: undefined,
      metadata: {},
    });
    setFormTitle(initialTitle ?? 'Untitled form');
    setFormDescription(initialDescription ?? '');
    setLoading(false);
  }, [formId, getFormFields, initialTitle, initialDescription, loadSchema, toast]);

  useEffect(() => {
    if (!open) return;
    void initialise();
  }, [open, initialise]);

  const handleAddTemplate = (template: FieldTemplate) => {
    if (!schema || !schema.sections.length) return;
    const targetSectionId = activeSectionId ?? schema.sections[0].id;
    addField(targetSectionId, {
      type: template.type,
      label: template.label,
      options: template.type === 'select' || template.type === 'checkbox' || template.type === 'radio' ? ['Option 1'] : [],
    });
  };

  const handleSave = async () => {
    const current = useFormSchemaStore.getState().schema;
    if (!current) return;

    if (!formTitle.trim()) {
      toast({ title: 'Form title required', description: 'Please provide a title before saving.', variant: 'destructive' });
      return;
    }

    const fields = current.sections.flatMap((section) => section.fields);
    if (fields.some((field) => !field.label.trim())) {
      toast({ title: 'Field label required', description: 'All fields must have a label.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const updateResult = await supabase
        .from('forms')
        .update({ title: formTitle, description: formDescription || null })
        .eq('id', formId);

      if (updateResult.error) {
        toast({ title: 'Save failed', description: 'Unable to update form details.', variant: 'destructive' });
        return;
      }

      type SaveField = Omit<Tables<'form_fields'>, 'id' | 'form_id' | 'created_at' | 'updated_at'>;
      const payload: SaveField[] = fields.map((field, index) => ({
        field_order: index + 1,
        field_type: field.type,
        label: field.label,
        placeholder: field.placeholder ?? null,
        description: null,
        is_required: field.required ?? false,
        options: field.options && field.options.length > 0 ? field.options : null,
        validation_rules: field.validation ?? null,
        min_value: field.min_value ?? null,
        max_value: field.max_value ?? null,
        step_value: field.step_value ?? null,
        formula_expression: field.formula_expression ?? null,
        dependent_fields: field.dependent_fields ?? null,
        rating_config: field.rating_config ?? null,
        scan_config: field.scan_config ?? null,
        media_config: field.media_config ?? null,
      }));

      const { error } = await saveFormFields(formId, payload);
      if (error) {
        toast({ title: 'Save failed', description: 'Unable to save form changes.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Form saved', description: 'All changes have been stored.' });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const sectionCount = schema?.sections.length ?? 0;
  const fieldCount = schema?.sections.reduce((sum, section) => sum + section.fields.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[calc(100vh-3rem)] w-full max-w-[1200px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 space-y-1 border-b px-6 py-4">
          <DialogTitle className="text-2xl font-semibold">Form editor</DialogTitle>
          <DialogDescription>Compose fields, configure options, and preview the live form experience.</DialogDescription>
          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-muted-foreground">
            <div>{sectionCount} sections</div>
            <div>{fieldCount} fields</div>
          </div>
          <div className="grid gap-3 pt-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form title</label>
              <Input
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                placeholder="Enter form title"
                aria-label="Form title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
              <Textarea
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                placeholder="Describe the purpose of this form"
                rows={2}
                aria-label="Form description"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col">
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="min-h-0 min-w-[220px]">
              <FormFieldLibrary onAddField={handleAddTemplate} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={40} className="min-h-0">
              <FormEditorPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={25} className="min-h-0">
              <FormLivePreview />
            </ResizablePanel>
          </ResizablePanelGroup>
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading form fields…
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t bg-muted/40 px-6 py-4">
          <div className="flex flex-col text-xs text-muted-foreground">
            <span>{formTitle}</span>
            <span>{loading ? 'Loading form content…' : 'Live preview updates automatically.'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
