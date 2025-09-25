
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, Upload, X, Clock, Users, Star } from 'lucide-react';
import { useForms } from '@/hooks/useForms';
import FormBuilderDialog from './FormBuilderDialog';

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormCreated?: (formId: string) => void;
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

export default function CreateFormDialog({ open, onOpenChange, onFormCreated }: CreateFormDialogProps) {
  const { createForm } = useForms();
  const [currentStep, setCurrentStep] = useState<CreationStep>('select-method');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);

  const resetDialog = () => {
    setCurrentStep('select-method');
    setSelectedTemplate(null);
    setUploadedFile(null);
    setCreatedFormId(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const createFormAndStartBuilder = async (title: string = "New Form", description: string = "") => {
    const formData = {
      title,
      description: description || undefined,
      department_id: undefined,
      is_anonymous: false,
    };
    
    const { data, error } = await createForm(formData);
    if (!error && data) {
      setCreatedFormId(data.id);
      setCurrentStep('build-fields');
    }
  };

  const handleFormBuilderClose = (open: boolean) => {
    if (!open && createdFormId) {
      resetDialog();
      onOpenChange(false);
      onFormCreated?.(createdFormId);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">How would you like to create your form?</h3>
        <p className="text-muted-foreground">Choose the method that works best for you</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
          onClick={() => createFormAndStartBuilder()}
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
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
          onClick={() => setCurrentStep('template-selection')}
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
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
          onClick={() => setCurrentStep('file-upload')}
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

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-method')}>
          ← Back
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Choose a template</h3>
          <p className="text-muted-foreground">Select a pre-built form to get started quickly</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {formTemplates.map((template) => (
          <Card 
            key={template.id}
            className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${
              selectedTemplate?.id === template.id ? 'border-primary' : 'hover:border-primary/20'
            }`}
            onClick={() => {
              setSelectedTemplate(template);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                  </div>
                </div>
                {template.popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {template.fields} fields
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {selectedTemplate && (
        <div className="flex justify-end">
          <Button onClick={() => createFormAndStartBuilder(selectedTemplate.name, selectedTemplate.description)}>
            Use "{selectedTemplate.name}" Template
          </Button>
        </div>
      )}
    </div>
  );

  const renderFileUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('select-method')}>
          ← Back
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Upload a file</h3>
          <p className="text-muted-foreground">Upload a document and we'll generate a form based on it</p>
        </div>
      </div>
      
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <input
          type="file"
          id="file-upload"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-semibold mb-2">Choose a file to upload</h4>
          <p className="text-muted-foreground mb-4">Support for PDF, DOC, DOCX, and TXT files</p>
          <Button type="button" variant="outline">Browse Files</Button>
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
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {uploadedFile && (
        <div className="flex justify-end">
          <Button onClick={() => createFormAndStartBuilder(uploadedFile.name.replace(/\.[^/.]+$/, ""))}>
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
        initialTitle={selectedTemplate?.name || uploadedFile?.name.replace(/\.[^/.]+$/, "") || "New Form"}
        initialDescription={selectedTemplate?.description || ""}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription>
            Create a new form to collect data from your team or customers.
          </DialogDescription>
        </DialogHeader>
        
        {currentStep === 'select-method' && renderMethodSelection()}
        {currentStep === 'template-selection' && renderTemplateSelection()}
        {currentStep === 'file-upload' && renderFileUpload()}
      </DialogContent>
    </Dialog>
  );
}
