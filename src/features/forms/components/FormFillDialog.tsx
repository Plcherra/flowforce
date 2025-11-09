import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForms } from '@/hooks/useForms';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/public-types';
import { FormSubmissionData } from '@/types/api';
import {
  LocationData,
  SignatureData,
  RatingData,
  RatingConfig,
  ScanData,
  ScanConfig,
  TaskData,
  ImageSelectionData,
  FormFieldType,
  MediaConfig,
} from '@/types/forms';
import { LocationField } from './fields/LocationField';
import { ImageUploadField } from './fields/ImageUploadField';
import { VideoUploadField } from './fields/VideoUploadField';
import { AudioRecordingField } from './fields/AudioRecordingField';
import { FileUploadField } from './fields/FileUploadField';
import { FormulaField } from './fields/FormulaField';
import { NumberSliderField } from './fields/NumberSliderField';
import { YesNoField } from './fields/YesNoField';
import { DescriptionField } from './fields/DescriptionField';
import { SignatureField } from './fields/SignatureField';
import { RatingField } from './fields/RatingField';
import { ScannerField } from './fields/ScannerField';
import { TaskField } from './fields/TaskField';
import { ImageSelectionField } from './fields/ImageSelectionField';
import { orderFormFields } from './utils/orderFormFields';

type FormFieldDataLocal = Tables<'form_fields'>;

type ConditionType = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'none_of';

interface ConditionalLogicConfig {
  enabled?: boolean;
  field_id?: string;
  condition_type?: ConditionType;
  condition_values?: unknown[];
}

type ValidationRules = {
  conditional_logic?: ConditionalLogicConfig;
} | null;

interface FormFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  onSubmitted?: () => void;
}

export default function FormFillDialog({ open, onOpenChange, formId, onSubmitted }: FormFillDialogProps) {
  const { getFormFields, submitForm } = useForms();
  const [fields, setFields] = useState<FormFieldDataLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  const form = useForm<FormSubmissionData>({
    defaultValues: {},
  });

  const formValues = form.watch();

  const updateVisibleFields = useCallback(() => {
    const visible = new Set<string>();
    
    fields.forEach((field) => {
      const fieldConfig = (field.validation_rules as ValidationRules) ?? null;
      const conditionalLogic = fieldConfig?.conditional_logic;
      
      if (!conditionalLogic?.enabled) {
        visible.add(field.id);
        return;
      }

      const { field_id, condition_type, condition_values } = conditionalLogic;
      if (!field_id || !condition_type) {
        visible.add(field.id);
        return;
      }

      // Find the referenced field
      const referencedField = fields.find((candidate) => candidate.id === field_id);
      if (!referencedField) {
        visible.add(field.id);
        return;
      }

      const referencedValue = formValues[referencedField.id];
      const normalizedValues = Array.isArray(condition_values)
        ? condition_values.map((value) => String(value))
        : [];
      const referencedValueAsString = referencedValue == null ? '' : String(referencedValue);
      let shouldShow = false;

      switch (condition_type) {
        case 'equals':
          shouldShow = normalizedValues.includes(referencedValueAsString);
          break;
        case 'not_equals':
          shouldShow = !normalizedValues.includes(referencedValueAsString);
          break;
        case 'contains':
          shouldShow = normalizedValues.some((value) => referencedValueAsString.includes(value));
          break;
        case 'not_contains':
          shouldShow = !normalizedValues.some((value) => referencedValueAsString.includes(value));
          break;
        case 'any_of':
          if (Array.isArray(referencedValue)) {
            shouldShow = referencedValue.some((value) =>
              normalizedValues.includes(String(value)),
            );
          } else {
            shouldShow = normalizedValues.includes(referencedValueAsString);
          }
          break;
        case 'none_of':
          if (Array.isArray(referencedValue)) {
            shouldShow = !referencedValue.some((value) =>
              normalizedValues.includes(String(value)),
            );
          } else {
            shouldShow = !normalizedValues.includes(referencedValueAsString);
          }
          break;
        default:
          shouldShow = true;
      }

      if (shouldShow) {
        visible.add(field.id);
      }
    });

    setVisibleFields(visible);
  }, [fields, formValues]);

  const getDefaultValue = useCallback((field: FormFieldDataLocal) => {
    const fieldType = field.field_type as FormFieldType;
    switch (fieldType) {
      case 'checkbox':
        return [];
      case 'radio':
      case 'select':
        return '';
      case 'number':
      case 'number_slider':
        return field.min_value || 0;
      case 'date':
      case 'datetime':
        return '';
      case 'file':
      case 'file_upload':
        return [];
      case 'yes_no':
        return null;
      case 'location':
        return null;
      case 'image_upload':
      case 'video_upload':
      case 'audio_recording':
        return [];
      case 'signature':
        return null;
      case 'rating':
        return { rating_value: 0, max_rating: 5, rating_type: 'stars' as const };
      case 'scanner':
        return null;
      case 'task':
        return {
          task_title: '',
          priority: 'medium' as const,
          status: 'pending' as const,
          created_at: new Date().toISOString()
        };
      case 'image_selection':
        return { selected_images: [], image_urls: [] };
      case 'formula':
        return 0;
      case 'description':
        return '';
      default:
        return '';
    }
  }, []);

  const loadFormFields = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const { data, error } = await getFormFields(formId);
      if (error) {
        toast({
          title: 'Error',
          description: 'Unable to load form fields',
          variant: 'destructive',
        });
        setFields([]);
        form.reset({});
        return;
      }

      const rows = (data ?? []) as FormFieldDataLocal[];
      setFields(rows);

      const defaultValues: FormSubmissionData = {};
      rows.forEach((field) => {
        defaultValues[field.id] = getDefaultValue(field);
      });
      form.reset(defaultValues);
    } finally {
      setLoading(false);
    }
  }, [formId, getFormFields, form, getDefaultValue]);

  useEffect(() => {
    if (open && formId) {
      void loadFormFields();
    } else if (!open) {
      setFields([]);
      setVisibleFields(new Set());
    }
  }, [open, formId, loadFormFields]);

  useEffect(() => {
    if (fields.length === 0) {
      setVisibleFields(new Set());
      return;
    }
    updateVisibleFields();
  }, [fields, updateVisibleFields]);

  const orderedFields = useMemo(() => orderFormFields(fields), [fields]);

  const onSubmit = async (values: FormSubmissionData) => {
    const { error } = await submitForm(formId, values);
    if (!error) {
      toast({
        title: "Success",
        description: "Form submitted successfully!"
      });
      form.reset();
      onOpenChange(false);
      onSubmitted?.();
    }
  };

  const getFieldOptions = (field: FormFieldDataLocal): string[] => {
    if (!field.options) return [];
    if (Array.isArray(field.options)) {
      return field.options.map(opt => String(opt));
    }
    if (typeof field.options === 'string') {
      try {
        const parsed = JSON.parse(field.options);
        return Array.isArray(parsed) ? parsed.map(opt => String(opt)) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseConfig = <T extends Record<string, unknown>>(config: unknown, defaultConfig: T = {} as T): T => {
    if (!config) return defaultConfig;

    if (typeof config === 'string') {
      try {
        const parsed = JSON.parse(config);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...defaultConfig, ...(parsed as Record<string, unknown>) } as T;
        }
      } catch {
        return defaultConfig;
      }
      return defaultConfig;
    }

    if (typeof config === 'object' && !Array.isArray(config)) {
      return { ...defaultConfig, ...(config as Record<string, unknown>) } as T;
    }

    return defaultConfig;
  };

  const renderField = (field: FormFieldDataLocal) => {
    const fieldName = field.id;
    const options = getFieldOptions(field);
    const fieldType = field.field_type as FormFieldType;

    switch (fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <Input 
                    type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
                    placeholder={field.placeholder || ''}
                    value={String(formField.value || '')}
                    onChange={formField.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <Textarea 
                    placeholder={field.placeholder || ''}
                    className="min-h-[100px]"
                    value={String(formField.value || '')}
                    onChange={formField.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'number':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <Input 
                    type="number"
                    placeholder={field.placeholder || ''}
                    value={String(formField.value || '')}
                    onChange={formField.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'date':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <Input type="date" value={String(formField.value || '')} onChange={formField.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'datetime':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <Input type="datetime-local" value={String(formField.value || '')} onChange={formField.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'select':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <Select value={formField.value == null ? '' : String(formField.value)} onValueChange={formField.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((option: string, index: number) => (
                      <SelectItem key={index} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'radio':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem className="space-y-3">
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <RadioGroup
                    onValueChange={formField.onChange}
                    value={formField.value == null ? '' : String(formField.value)}
                    className="flex flex-col space-y-1"
                  >
                    {options.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${fieldName}-${index}`} />
                        <label htmlFor={`${fieldName}-${index}`} className="text-sm font-normal">
                          {option}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'checkbox':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'Please select at least one option' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <div className="space-y-2">
                  {options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        checked={Array.isArray(formField.value) && formField.value.includes(option)}
                        onCheckedChange={(checked) => {
                          const currentValue = Array.isArray(formField.value) ? formField.value : [];
                          const newValue = checked
                            ? [...currentValue, option]
                            : currentValue.filter((v: string) => v !== option);
                          formField.onChange(newValue);
                        }}
                      />
                      <label className="text-sm font-normal">{option}</label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'file':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{ required: field.is_required ? 'This field is required' : false }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormControl>
                  <Input 
                    type="file" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      formField.onChange(files);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'description':
        return (
          <DescriptionField
            key={field.id}
            label={field.label}
            description={field.description || ''}
            content={field.placeholder || ''}
          />
        );

      case 'formula':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormulaField
                  label={field.label}
                  description={field.description}
                  formula={field.formula_expression || ''}
                  onChange={formField.onChange}
                  formData={form.getValues()}
                />
              </FormItem>
            )}
          />
        );

      case 'number_slider':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <NumberSliderField
                  label={field.label}
                  description={field.description}
                  value={typeof formField.value === 'number' ? formField.value : (field.min_value || 0)}
                  min={field.min_value || 0}
                  max={field.max_value || 100}
                  step={field.step_value || 1}
                  onChange={formField.onChange}
                  showInput={true}
                  showLabels={true}
                />
              </FormItem>
            )}
          />
        );

      case 'yes_no':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <YesNoField
                  label={field.label}
                  description={field.description}
                  value={typeof formField.value === 'boolean' ? formField.value : null}
                  required={field.is_required || false}
                  onChange={formField.onChange}
                />
              </FormItem>
            )}
          />
        );

      case 'location':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <LocationField
                  label={field.label}
                  description={field.description}
                  value={formField.value as LocationData | undefined}
                  onChange={formField.onChange}
                />
              </FormItem>
            )}
          />
        );

      case 'image_upload': {
        const imageConfig = parseConfig<MediaConfig>(field.media_config, {});
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <ImageUploadField
                  label={field.label}
                  description={field.description}
                  value={Array.isArray(formField.value) ? formField.value : []}
                  onChange={formField.onChange}
                  maxFiles={imageConfig.max_files ?? 5}
                  maxSize={imageConfig.max_size ?? 10}
                />
              </FormItem>
            )}
          />
        );
      }

      case 'video_upload': {
        const videoConfig = parseConfig<MediaConfig>(field.media_config, {});
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <VideoUploadField
                  label={field.label}
                  description={field.description}
                  value={Array.isArray(formField.value) ? formField.value : []}
                  onChange={formField.onChange}
                  maxFiles={videoConfig.max_files ?? 3}
                  maxSize={videoConfig.max_size ?? 50}
                />
              </FormItem>
            )}
          />
        );
      }

      case 'audio_recording': {
        const audioConfig = parseConfig<MediaConfig>(field.media_config, {});
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <AudioRecordingField
                  label={field.label}
                  description={field.description}
                  value={Array.isArray(formField.value) ? formField.value : []}
                  onChange={formField.onChange}
                  maxRecordings={audioConfig.max_files ?? 3}
                  maxDuration={300}
                />
              </FormItem>
            )}
          />
        );
      }

      case 'file_upload': {
        const fileConfig = parseConfig<MediaConfig>(field.media_config, {});
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FileUploadField
                  label={field.label}
                  description={field.description}
                  value={Array.isArray(formField.value) ? formField.value : []}
                  onChange={formField.onChange}
                  maxFiles={fileConfig.max_files ?? 5}
                  maxSize={fileConfig.max_size ?? 10}
                  acceptedTypes={fileConfig.accepted_types}
                />
              </FormItem>
            )}
          />
        );
      }

      case 'signature':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <SignatureField
                  label={field.label}
                  description={field.description}
                  value={formField.value as SignatureData | undefined}
                  onChange={formField.onChange}
                  required={field.is_required || false}
                />
              </FormItem>
            )}
          />
        );

      case 'rating': {
        const ratingConfig = parseConfig<RatingConfig>(field.rating_config, {
          max_rating: 5,
          rating_type: 'stars',
        });
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <RatingField
                  label={field.label}
                  description={field.description}
                  value={formField.value as RatingData | undefined}
                  config={ratingConfig}
                  onChange={formField.onChange}
                />
              </FormItem>
            )}
          />
        );
      }

      case 'scanner': {
        const scannerConfig = parseConfig<ScanConfig>(field.scan_config, {
          scan_types: ['barcode', 'qr_code'],
        });
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <ScannerField
                  label={field.label}
                  description={field.description}
                  value={formField.value as ScanData | undefined}
                  config={scannerConfig}
                  onChange={formField.onChange}
                />
              </FormItem>
            )}
          />
        );
      }

      case 'task':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <TaskField
                  label={field.label}
                  description={field.description}
                  value={formField.value as TaskData | undefined}
                  onChange={formField.onChange}
                />
              </FormItem>
            )}
          />
        );

      case 'image_selection':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <ImageSelectionField
                  label={field.label}
                  description={field.description}
                  value={formField.value as ImageSelectionData | undefined}
                  predefinedImages={Array.isArray(field.options) ? field.options.map(opt => String(opt)) : []}
                  onChange={formField.onChange}
                />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fill Form</DialogTitle>
          <DialogDescription>
            Complete the form fields below and submit your response.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading form fields...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {orderedFields
                .filter(field => visibleFields.has(field.id))
                .map(renderField)}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
