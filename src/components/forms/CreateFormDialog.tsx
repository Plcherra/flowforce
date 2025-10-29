
import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, Upload, X, Users, Loader2 } from 'lucide-react';
import { useForms } from '@/hooks/useForms';
import FormBuilderDialog from './FormBuilderDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { importFormFromFile } from '@/services/forms/formImportService';

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormCreated?: (formId: string) => void;
  preferredMethod?: 'blank' | 'template' | 'upload';
  onPreferredMethodHandled?: () => void;
}

type CreationStep = 'select-method' | 'template-selection' | 'file-upload' | 'build-fields';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  fields: number;
  popular?: boolean;
}

const formTemplates: FormTemplate[] = [
  {
    id: 'employee-feedback',
    name: 'Employee Feedback',
    description: 'Collect feedback from employees about workplace satisfaction',
    category: 'HR',
    icon: 'Users',
    fields: 8,
    popular: true,
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Register attendees for company events',
    category: 'Events',
    icon: 'Calendar',
    fields: 6,
  },
  {
    id: 'incident-report',
    name: 'Incident Report',
    description: 'Report workplace incidents and safety concerns',
    category: 'Safety',
    icon: 'AlertTriangle',
    fields: 10,
    popular: true,
  },
  {
    id: 'leave-request',
    name: 'Leave Request',
    description: 'Submit time off and leave requests',
    category: 'HR',
    icon: 'Clock',
    fields: 7,
  },
  {
    id: 'customer-survey',
    name: 'Customer Survey',
    description: 'Gather customer feedback and satisfaction ratings',
    category: 'Customer',
    icon: 'Star',
    fields: 12,
  },
  {
    id: 'training-evaluation',
    name: 'Training Evaluation',
    description: 'Evaluate training effectiveness and gather feedback',
    category: 'Training',
    icon: 'BookOpen',
    fields: 9,
  },
];

export default function CreateFormDialog({
  open,
  onOpenChange,
  onFormCreated,
  preferredMethod,
  onPreferredMethodHandled,
}: CreateFormDialogProps) {
  const { createForm } = useForms();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<CreationStep>('select-method');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);
  const [formTitleOverride, setFormTitleOverride] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const resetDialog = () => {
    setCurrentStep('select-method');
    setSelectedTemplate(null);
    setUploadedFile(null);
    setCreatedFormId(null);
    setFormTitleOverride(null);
    setCreating(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const createFormAndStartBuilder = useCallback(async (
    title: string = 'New Form',
    description: string = '',
    options?: { fromFile?: boolean },
  ) => {
    setCreating(true);
    try {
      if (options?.fromFile) {
        if (!uploadedFile) {
          throw new Error('No file selected for import');
        }
        if (!user) {
          throw new Error('You must be signed in to import forms from files.');
        }

        const baseName = uploadedFile.name.replace(/\.[^/.]+$/, '');
        const { form } = await importFormFromFile(uploadedFile, user.id);
        setCreatedFormId(form.id);
        setCurrentStep('build-fields');
        setUploadedFile(null);
        setFormTitleOverride(baseName);
        onFormCreated?.(form.id);
        toast({
          title: 'Form imported',
          description: `${uploadedFile.name} is ready for refinement.`,
        });
        return;
      }

      const formData = {
        title,
        description: description || undefined,
        department_id: undefined,
        is_anonymous: false,
      };

      const { data, error } = await createForm(formData);
      if (error || !data) {
        throw error ?? new Error('Failed to create form');
      }
      setCreatedFormId(data.id);
      setCurrentStep('build-fields');
      setFormTitleOverride(title);
      onFormCreated?.(data.id);
    } catch (error) {
      console.error('Unable to create form', error);
      toast({
        title: 'Form creation failed',
        description: error instanceof Error ? error.message : 'Unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }, [createForm, onFormCreated, toast, uploadedFile, user]);

  useEffect(() => {
    if (!open || !preferredMethod || creating) return;

    if (preferredMethod === 'blank') {
      void (async () => {
        await createFormAndStartBuilder();
        onPreferredMethodHandled?.();
      })();
      return;
    }

    if (preferredMethod === 'template') {
      setCurrentStep('template-selection');
    } else if (preferredMethod === 'upload') {
      setCurrentStep('file-upload');
    }
    onPreferredMethodHandled?.();
  }, [open, preferredMethod, creating, createFormAndStartBuilder, onPreferredMethodHandled]);

  const handleFormBuilderClose = (open: boolean) => {
    if (!open && createdFormId) {
      resetDialog();
      onOpenChange(false);
      onFormCreated?.(createdFormId);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (creating) return;
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const renderMethodSelection = () => {
    const cardBaseClasses =
      'relative cursor-pointer border-2 transition-shadow hover:shadow-md hover:border-primary/20';
    const disabledClasses = creating ? 'pointer-events-none opacity-60 cursor-not-allowed' : '';

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">How would you like to create your form?</h3>
          <p className="text-muted-foreground">Choose the method that works best for you</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card
            className={`${cardBaseClasses} ${disabledClasses}`}
            onClick={() => {
              if (creating) return;
              void createFormAndStartBuilder();
            }}
          >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Start from scratch</h4>
            <CardDescription>Create a custom form from the ground up</CardDescription>
          </CardContent>
        </Card>

          <Card
            className={`${cardBaseClasses} ${disabledClasses}`}
            onClick={() => {
              if (creating) return;
              setCurrentStep('template-selection');
            }}
          >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Use a template</h4>
            <CardDescription>Choose from pre-built form templates</CardDescription>
          </CardContent>
        </Card>

          <Card
            className={`${cardBaseClasses} ${disabledClasses}`}
            onClick={() => {
              if (creating) return;
              setCurrentStep('file-upload');
            }}
          >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Create from file</h4>
            <Badge variant="secondary" className="text-xs mb-2">Beta</Badge>
            <CardDescription>Upload a document to generate a form</CardDescription>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-method')} disabled={creating}>
          ← Back
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Choose a template</h3>
          <p className="text-muted-foreground">Select a pre-built form to get started quickly</p>
        </div>
      </div>

      <div className="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
        {formTemplates.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          return (
            <Card
              key={template.id}
              className={`cursor-pointer border-2 transition-shadow hover:shadow-md ${
                isSelected ? 'border-primary' : 'hover:border-primary/20'
              } ${creating ? 'pointer-events-none opacity-60' : ''}`}
              onClick={() => {
                if (creating) return;
                setSelectedTemplate(template);
              }}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    </div>
                  </div>
                  {template.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                </div>
                <p className="mb-2 text-sm text-muted-foreground">{template.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {template.fields} fields
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTemplate && (
        <div className="flex justify-end">
          <Button
            onClick={() => createFormAndStartBuilder(selectedTemplate.name, selectedTemplate.description)}
            disabled={creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Use &quot;{selectedTemplate.name}&quot; Template
          </Button>
        </div>
      )}
    </div>
  );

  const renderFileUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-method')} disabled={creating}>
          ← Back
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Upload a file</h3>
          <p className="text-muted-foreground">Upload a document and we&apos;ll generate a form based on it</p>
        </div>
      </div>
      
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <input
          type="file"
          id="file-upload"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="hidden"
          disabled={creating}
        />
        <label htmlFor="file-upload" className={`cursor-pointer ${creating ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-semibold mb-2">Choose a file to upload</h4>
          <p className="text-muted-foreground mb-4">Support for PDF, DOC, DOCX, and TXT files</p>
          <Button type="button" variant="outline" disabled={creating}>
            Browse Files
          </Button>
        </label>
      </div>
      
      {uploadedFile && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <FileText className="h-5 w-5" />
          <span className="flex-1 text-sm">{uploadedFile.name}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setUploadedFile(null);
            }}
            disabled={creating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {uploadedFile && (
        <div className="flex justify-end">
          <Button
            onClick={() =>
              createFormAndStartBuilder(uploadedFile.name.replace(/\.[^/.]+$/, ''), '', { fromFile: true })
            }
            disabled={creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Continue with File
          </Button>
        </div>
      )}
    </div>
  );

  if (currentStep === 'build-fields' && createdFormId) {
    return (
      <FormBuilderDialog 
        open={open} 
        onOpenChange={handleFormBuilderClose} 
        formId={createdFormId}
        initialTitle={formTitleOverride || selectedTemplate?.name || 'New Form'}
        initialDescription={selectedTemplate?.description || ""}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="relative max-h-[80vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription>
            Create a new form to collect data from your team or customers.
          </DialogDescription>
        </DialogHeader>
        
        {currentStep === 'select-method' && renderMethodSelection()}
        {currentStep === 'template-selection' && renderTemplateSelection()}
        {currentStep === 'file-upload' && renderFileUpload()}

        {creating && (
          <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-background/75">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Preparing your form…
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
