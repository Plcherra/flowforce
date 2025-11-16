import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  FileImage,
  Info,
  Layers,
  Loader2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useForms, type FormWithMeta } from '@/hooks/useForms';
import { useFormDefinition } from '@/features/forms/hooks/useFormDefinition';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/public-types';
import { FormSubmissionData } from '@/types/api';
import {
  FormFieldType,
  ImageSelectionData,
  LocationData,
  MediaConfig,
  RatingConfig,
  RatingData,
  ScanConfig,
  SignatureData,
  TaskData,
} from '@/types/forms';
import { LocationField } from '@/components/forms/fields/LocationField';
import { ImageUploadField } from '@/components/forms/fields/ImageUploadField';
import { VideoUploadField } from '@/components/forms/fields/VideoUploadField';
import { AudioRecordingField } from '@/components/forms/fields/AudioRecordingField';
import { FileUploadField } from '@/components/forms/fields/FileUploadField';
import { FormulaField } from '@/components/forms/fields/FormulaField';
import { NumberSliderField } from '@/components/forms/fields/NumberSliderField';
import { YesNoField } from '@/components/forms/fields/YesNoField';
import { DescriptionField } from '@/components/forms/fields/DescriptionField';
import { SignatureField } from '@/components/forms/fields/SignatureField';
import { RatingField } from '@/components/forms/fields/RatingField';
import { ScannerField } from '@/components/forms/fields/ScannerField';
import { TaskField } from '@/components/forms/fields/TaskField';
import { ImageSelectionField } from '@/components/forms/fields/ImageSelectionField';
import { orderFormFields } from '@/components/forms/utils/orderFormFields';
import {
  FormReviewLayout,
  FormLabelValueRow,
  FormNarrativeBlock,
  FormImageBlock,
  type FormReviewLayoutSection,
} from '@/components/forms/presentation';
import { exportFormResponseToPdf } from '@/utils/formExport';

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

type WizardStepId = 'overview' | 'questions' | 'operations' | 'attachments' | 'review';

interface WizardStepMeta {
  id: WizardStepId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  fieldIds?: string[];
}

interface FieldBuckets {
  questions: FormFieldDataLocal[];
  operations: FormFieldDataLocal[];
  attachments: FormFieldDataLocal[];
}

const DETAIL_TYPES: FormFieldType[] = [
  'text',
  'number',
  'email',
  'phone',
  'date',
  'datetime',
  'select',
  'radio',
  'checkbox',
  'yes_no',
  'number_slider',
  'rating',
  'signature',
  'scanner',
  'task',
  'image_selection',
  'location',
  'formula',
];

const NARRATIVE_TYPES: FormFieldType[] = ['textarea', 'description'];
const ATTACHMENT_TYPES: FormFieldType[] = ['file', 'file_upload', 'image_upload', 'video_upload', 'audio_recording'];

const groupFieldsByCategory = (fields: FormFieldDataLocal[]): FieldBuckets => {
  const buckets: FieldBuckets = {
    questions: [],
    operations: [],
    attachments: [],
  };

  fields.forEach((field) => {
    const type = field.field_type as FormFieldType;
    if (ATTACHMENT_TYPES.includes(type)) {
      buckets.attachments.push(field);
      return;
    }
    if (NARRATIVE_TYPES.includes(type)) {
      buckets.operations.push(field);
      return;
    }
    buckets.questions.push(field);
  });

  return buckets;
};

const buildWizardSteps = (buckets: FieldBuckets): WizardStepMeta[] => {
  const steps: WizardStepMeta[] = [
    { id: 'overview', name: 'Overview', icon: Info },
  ];

  if (buckets.questions.length > 0) {
    steps.push({
      id: 'questions',
      name: 'Checklist & Questions',
      icon: ClipboardList,
      fieldIds: buckets.questions.map((field) => field.id),
    });
  }

  if (buckets.operations.length > 0) {
    steps.push({
      id: 'operations',
      name: 'Operations & Impact',
      icon: Layers,
      fieldIds: buckets.operations.map((field) => field.id),
    });
  }

  if (buckets.attachments.length > 0) {
    steps.push({
      id: 'attachments',
      name: 'Attachments',
      icon: FileImage,
      fieldIds: buckets.attachments.map((field) => field.id),
    });
  }

  steps.push({ id: 'review', name: 'Review & Submit', icon: CheckCircle });
  return steps;
};

const detailTypes = new Set(DETAIL_TYPES);
const narrativeTypes = new Set(NARRATIVE_TYPES);
const attachmentTypes = new Set(ATTACHMENT_TYPES);
const getDefaultValue = (field: FormFieldDataLocal) => {
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
        created_at: new Date().toISOString(),
      };
    case 'image_selection':
      return { selected_images: [], image_urls: [] } as ImageSelectionData;
    case 'formula':
      return 0;
    case 'description':
      return '';
    default:
      return '';
  }
};

const getFieldOptions = (field: FormFieldDataLocal): string[] => {
  if (!field.options) return [];
  if (Array.isArray(field.options)) {
    return field.options.map((opt) => String(opt));
  }
  if (typeof field.options === 'string') {
    try {
      const parsed = JSON.parse(field.options);
      return Array.isArray(parsed) ? parsed.map((opt) => String(opt)) : [];
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
const formatAttachmentValue = (value: unknown): React.ReactNode => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return (
    <ul className="space-y-1 text-sm text-foreground">
      {value.map((entry, index) => {
        if (entry && typeof entry === 'object') {
          const file = entry as { filename?: string; url?: string };
          return (
            <li key={`${file.url ?? file.filename ?? index}-${index}`} className="flex items-center gap-2">
              <span className="font-medium">{file.filename ?? 'Attachment'}</span>
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline"
                >
                  View
                </a>
              )}
            </li>
          );
        }
        if (typeof entry === 'string') {
          return (
            <li key={`${entry}-${index}`} className="text-sm">
              <a href={entry} target="_blank" rel="noreferrer" className="text-primary underline">
                {entry}
              </a>
            </li>
          );
        }
        return (
          <li key={`attachment-${index}`} className="text-sm">
            Attachment {index + 1}
          </li>
        );
      })}
    </ul>
  );
};

const formatListValue = (value: unknown): React.ReactNode => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {value.map((entry, index) => (
        <li key={`${String(entry)}-${index}`}>{String(entry)}</li>
      ))}
    </ul>
  );
};

const buildReviewSections = (
  buckets: FieldBuckets,
  values: FormSubmissionData,
  visibleFields: Set<string>,
): FormReviewLayoutSection[] => {
  const sections: FormReviewLayoutSection[] = [];

  const renderFieldValue = (field: FormFieldDataLocal) => {
    if (!visibleFields.has(field.id)) {
      return null;
    }

    const rawValue = values[field.id];
    const type = field.field_type as FormFieldType;

    if (narrativeTypes.has(type)) {
      return (
        <FormNarrativeBlock key={field.id} title={field.label} value={typeof rawValue === 'string' ? rawValue : ''} />
      );
    }

    if (attachmentTypes.has(type)) {
      if (type === 'image_upload') {
        const images = Array.isArray(rawValue) ? rawValue : [];
        return (
          <div key={field.id} className="space-y-3">
            <FormLabelValueRow label={field.label} />
            {images.length > 0 ? (
              images.map((src, index) => (
                <FormImageBlock key={`${src}-${index}`} src={typeof src === 'string' ? src : undefined} caption={`Image ${index + 1}`} />
              ))
            ) : (
              <FormImageBlock caption={field.label} />
            )}
          </div>
        );
      }
      return <FormLabelValueRow key={field.id} label={field.label} value={formatAttachmentValue(rawValue)} />;
    }

    if (Array.isArray(rawValue)) {
      return <FormLabelValueRow key={field.id} label={field.label} value={formatListValue(rawValue)} />;
    }

    if (rawValue && typeof rawValue === 'object') {
      return <FormLabelValueRow key={field.id} label={field.label} value={<pre>{JSON.stringify(rawValue, null, 2)}</pre>} />;
    }

    return (
      <FormLabelValueRow
        key={field.id}
        label={field.label}
        value={rawValue == null || String(rawValue).trim().length === 0 ? undefined : String(rawValue)}
      />
    );
  };

  if (buckets.questions.length > 0) {
    sections.push({
      id: 'section-questions',
      title: 'Checklist & Questions',
      content: <div className="space-y-4">{buckets.questions.map(renderFieldValue)}</div>,
    });
  }

  if (buckets.operations.length > 0) {
    sections.push({
      id: 'section-operations',
      title: 'Operations & Impact',
      content: <div className="space-y-4">{buckets.operations.map(renderFieldValue)}</div>,
    });
  }

  if (buckets.attachments.length > 0) {
    sections.push({
      id: 'section-attachments',
      title: 'Attachments',
      content: <div className="space-y-4">{buckets.attachments.map(renderFieldValue)}</div>,
    });
  }

  return sections;
};
interface FormFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string | null;
  form?: FormWithMeta | null;
  onSubmitted?: () => void;
}

export default function FormFillDialog({ open, onOpenChange, formId, form: initialForm, onSubmitted }: FormFillDialogProps) {
  const resolvedFormId = formId ?? initialForm?.id ?? null;
  const { submitForm } = useForms();
  const { toast } = useToast();
  const { user } = useAuth();

  const { form: hydratedForm, fields, isLoading, isError, error, refetch } = useFormDefinition({
    formId: resolvedFormId ?? undefined,
    initialForm,
  });

  const form = useForm<FormSubmissionData>({
    defaultValues: {},
    mode: 'onBlur',
  });
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const orderedFields = useMemo(() => orderFormFields(fields), [fields]);
  const buckets = useMemo(() => groupFieldsByCategory(orderedFields), [orderedFields]);
  const steps = useMemo(() => buildWizardSteps(buckets), [buckets]);
  const currentStep = steps[currentStepIndex] ?? steps[0];
  const progress = steps.length > 1 ? (currentStepIndex / (steps.length - 1)) * 100 : 100;

  const formValues = form.watch();

  const statusLabel = useMemo(() => {
    if (isLoading) return 'Loading form fields…';
    if (isError) return 'Unable to load form fields';
    if (orderedFields.length === 0) return 'No fields configured';
    return `${orderedFields.length} fields ready`;
  }, [isLoading, isError, orderedFields.length]);

  useEffect(() => {
    if (!open) {
      form.reset({});
      setVisibleFields(new Set());
      setHasInitialized(false);
      setSubmissionId(null);
      setCurrentStepIndex(0);
    }
  }, [open, form]);

  useEffect(() => {
    if (!hasInitialized && orderedFields.length > 0) {
      const defaultValues: FormSubmissionData = {};
      orderedFields.forEach((field) => {
        defaultValues[field.id] = getDefaultValue(field);
      });
      form.reset(defaultValues);
      setHasInitialized(true);
    }
  }, [orderedFields, hasInitialized, form]);

  const updateVisibleFields = useCallback(() => {
    const visible = new Set<string>();

    orderedFields.forEach((field) => {
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

      const referencedField = orderedFields.find((candidate) => candidate.id === field_id);
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
            shouldShow = referencedValue.some((value) => normalizedValues.includes(String(value)));
          } else {
            shouldShow = normalizedValues.includes(referencedValueAsString);
          }
          break;
        case 'none_of':
          if (Array.isArray(referencedValue)) {
            shouldShow = !referencedValue.some((value) => normalizedValues.includes(String(value)));
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
  }, [orderedFields, formValues]);

  useEffect(() => {
    updateVisibleFields();
  }, [updateVisibleFields]);

  const getFieldsForStep = useCallback(
    (stepId: WizardStepId) => {
      switch (stepId) {
        case 'questions':
          return buckets.questions.filter((field) => visibleFields.has(field.id));
        case 'operations':
          return buckets.operations.filter((field) => visibleFields.has(field.id));
        case 'attachments':
          return buckets.attachments.filter((field) => visibleFields.has(field.id));
        default:
          return [];
      }
    },
    [buckets, visibleFields],
  );

  const validateStep = useCallback(
    async (stepId: WizardStepId) => {
      const step = steps.find((item) => item.id === stepId);
      if (!step?.fieldIds || step.fieldIds.length === 0) {
        return true;
      }
      const names = step.fieldIds.filter((fieldId) => visibleFields.has(fieldId)) as (keyof FormSubmissionData)[];
      if (names.length === 0) {
        return true;
      }
      return form.trigger(names, { shouldFocus: true });
    },
    [steps, form, visibleFields],
  );

  const handleNext = useCallback(async () => {
    const current = steps[currentStepIndex];
    if (current && current.id !== 'review') {
      const isStepValid = await validateStep(current.id);
      if (!isStepValid) {
        return;
      }
    }
    setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [currentStepIndex, steps, validateStep]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  }, []);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!resolvedFormId) {
      toast({ title: 'Missing form', description: 'Please close and reopen this form.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error: submitError } = await submitForm(resolvedFormId, values);
      if (submitError) {
        toast({ title: 'Unable to submit form', description: submitError.message, variant: 'destructive' });
        return;
      }
      setSubmissionId(data?.id ?? null);
      toast({ title: 'Response submitted', description: 'Your form was submitted successfully.' });
      onSubmitted?.();
      setCurrentStepIndex(steps.length - 1);
    } finally {
      setIsSubmitting(false);
    }
  });

  const reviewSections = useMemo(() => buildReviewSections(buckets, formValues, visibleFields), [buckets, formValues, visibleFields]);

  const metaCardProps = useMemo(() => {
    const initials = user?.email ? user.email.split('@')[0].slice(0, 2).toUpperCase() : user?.id?.slice(0, 2) ?? '—';
    const userName = user?.user_metadata?.full_name ?? user?.email ?? '—';
    const localTime = new Date().toLocaleString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      title: hydratedForm?.title ?? 'Form response',
      userInitials: initials,
      userName,
      timestamp: localTime,
      timezone: timeZone,
      entryId: submissionId ? `#${submissionId.slice(0, 6)}` : '#Draft',
      statusLabel: submissionId ? 'Completed' : 'Draft',
    };
  }, [hydratedForm?.title, submissionId, user]);

  const handleExport = () => {
    void exportFormResponseToPdf({
      headerTitle: hydratedForm?.title,
      headerSubtitle: hydratedForm?.description ?? 'Form response preview',
      meta: metaCardProps,
      sections: reviewSections,
    });
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) {
      return;
    }
    onOpenChange(nextOpen);
  };
  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (isError && orderedFields.length === 0) {
      return (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          <p className="font-semibold">Unable to load form fields</p>
          <p className="mt-1 text-muted-foreground">{error instanceof Error ? error.message : 'Please try again.'}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    if (orderedFields.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          This form doesn’t have any fields configured yet.
        </div>
      );
    }

    switch (currentStep.id) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{hydratedForm?.title ?? 'Form response'}</h3>
              {hydratedForm?.description && (
                <p className="text-sm text-muted-foreground">{hydratedForm.description}</p>
              )}
            </div>
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
              Complete the following sections. Required fields are marked and validation runs on each step.
            </div>
          </div>
        );
      case 'questions':
      case 'operations':
      case 'attachments':
        return (
          <div className="space-y-6">
            {getFieldsForStep(currentStep.id).map((field) => renderField(field, form))}
          </div>
        );
      case 'review':
        return (
          <div className="space-y-6">
            <FormReviewLayout
              headerTitle={hydratedForm?.title ?? 'Form response'}
              headerSubtitle="Preview your answers before submitting."
              meta={metaCardProps}
              sections={reviewSections}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleExport}>
                Download PDF
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        style={{ transform: 'none' }}
        className="h-screen w-screen max-w-none overflow-hidden rounded-none border-none bg-background p-0 shadow-none"
      >
        <div className="flex h-full flex-col">
          <WizardTopBar
            title={hydratedForm?.title ?? 'Fill form'}
            description="Follow the guided steps to complete the form."
            currentStepIndex={currentStepIndex}
            totalSteps={steps.length}
            statusLabel={statusLabel}
            progress={progress}
            onClose={() => handleDialogChange(false)}
          />

          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <StepNavigation currentIndex={currentStepIndex} steps={steps} onStepChange={(next) => {
                if (next <= currentStepIndex) {
                  setCurrentStepIndex(next);
                }
              }} />

              <div className="flex flex-1 overflow-hidden">
                <Form {...form}>
                  <form className="flex-1 overflow-y-auto px-8 py-6" onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="space-y-6"
                      >
                        {renderStepContent()}
                      </motion.div>
                    </AnimatePresence>
                  </form>
                </Form>
              </div>

              <WizardFooter
                progress={progress}
                isSubmitting={isSubmitting}
                currentIndex={currentStepIndex}
                isLastStep={currentStep.id === 'review'}
                onBack={handleBack}
                onNext={handleNext}
                onSubmit={handleSubmit}
                canProceedNext={!isLoading}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function renderField(field: FormFieldDataLocal, form: ReturnType<typeof useForm<FormSubmissionData>>) {
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
              </FormLabel>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormControl>
                <Textarea
                  placeholder={field.placeholder || ''}
                  className="min-h-[120px]"
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
              </FormLabel>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormControl>
                <Input type="number" placeholder={field.placeholder || ''} value={String(formField.value || '')} onChange={formField.onChange} />
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
              </FormLabel>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <Select value={formField.value == null ? '' : String(formField.value)} onValueChange={formField.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {options.map((option, index) => (
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
              </FormLabel>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormControl>
                <RadioGroup
                  onValueChange={formField.onChange}
                  value={formField.value == null ? '' : String(formField.value)}
                  className="flex flex-col space-y-1"
                >
                  {options.map((option, index) => (
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
                {field.is_required && <span className="ml-1 text-destructive">*</span>}
              </FormLabel>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      checked={Array.isArray(formField.value) && formField.value.includes(option)}
                      onCheckedChange={(checked) => {
                        const current = Array.isArray(formField.value) ? formField.value : [];
                        if (checked) {
                          formField.onChange([...current, option]);
                        } else {
                          formField.onChange(current.filter((value) => value !== option));
                        }
                      }}
                    />
                    <span>{option}</span>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case 'file':
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
                value={formField.value as LocationData | null}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case 'scanner':
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
                value={formField.value as ScanData | null}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case 'task':
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <TaskField label={field.label} description={field.description} value={formField.value as TaskData} onChange={formField.onChange} />
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
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case 'description':
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={() => (
            <FormItem>
              <DescriptionField label={field.label} content={field.description ?? ''} />
            </FormItem>
          )}
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
              <FormulaField label={field.label} description={field.description} value={formField.value as number} onChange={formField.onChange} />
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
                value={Number(formField.value) || 0}
                onChange={formField.onChange}
                min={field.min_value ?? 0}
                max={field.max_value ?? 100}
                step={field.step_value ?? 1}
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
                value={formField.value as boolean | null}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    default:
      return null;
  }
}
function WizardTopBar({
  title,
  description,
  currentStepIndex,
  totalSteps,
  statusLabel,
  progress,
  onClose,
}: {
  title: string;
  description?: string;
  currentStepIndex: number;
  totalSteps: number;
  statusLabel: string;
  progress: number;
  onClose: () => void;
}) {
  return (
    <header className="border-b border-border/80 bg-background/95 px-8 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1 text-sm text-muted-foreground">{description}</DialogDescription>}
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-dashed">
            Step {currentStepIndex + 1} of {totalSteps}
          </Badge>
          <span>{statusLabel}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <Progress value={progress} className="mt-4 h-1.5" />
    </header>
  );
}

function StepNavigation({
  currentIndex,
  steps,
  onStepChange,
}: {
  currentIndex: number;
  steps: WizardStepMeta[];
  onStepChange: (index: number) => void;
}) {
  return (
    <div className="border-b border-border/60 px-8 py-3">
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (index <= currentIndex) {
                  onStepChange(index);
                }
              }}
              className={cn(
                'group flex min-w-[140px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                isCurrent && 'border-primary bg-primary/10 text-primary shadow-sm',
                isComplete && !isCurrent && 'border-primary/60 bg-primary/5 text-primary',
                index > currentIndex && 'border-border text-muted-foreground',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isComplete
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border text-muted-foreground',
                )}
              >
                {isComplete ? <CheckCircle className="h-3 w-3" /> : index + 1}
              </span>
              <span className="truncate text-left font-semibold">{step.name}</span>
              <Icon className="hidden h-4 w-4 text-muted-foreground/70 lg:block" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function WizardFooter({
  progress,
  isSubmitting,
  currentIndex,
  isLastStep,
  onBack,
  onNext,
  onSubmit,
  canProceedNext,
}: {
  progress: number;
  isSubmitting: boolean;
  currentIndex: number;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canProceedNext: boolean;
}) {
  return (
    <footer className="flex flex-col gap-4 border-t border-border bg-muted/20 px-8 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <span className="min-w-[120px] text-xs font-semibold text-muted-foreground">Completion {Math.round(progress)}%</span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onBack} disabled={currentIndex === 0 || isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {!isLastStep ? (
          <Button onClick={onNext} disabled={!canProceedNext || isSubmitting}>
            Next step
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={isSubmitting || !canProceedNext}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit form
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </footer>
  );
}
