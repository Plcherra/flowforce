import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Clock,
  Edit,
  FileText,
  Loader2,
  Star,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useForms } from "@/features/forms/hooks/useForms";
import type { FormFieldRow } from "@/features/forms/hooks/useForms";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { importFormFromFile } from "@/features/forms/services/formImportService";
import { logger } from "@/utils/logger";

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormCreated?: (formId: string) => void;
  preferredMethod?: "blank" | "template" | "upload";
  onPreferredMethodHandled?: () => void;
}

type CreationStep = "select-method" | "template-selection" | "file-upload";
type TemplateField = Omit<
  FormFieldRow,
  "id" | "form_id" | "created_at" | "updated_at"
>;

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  fieldCount: number;
  fieldPresets: TemplateField[];
  popular?: boolean;
}

const makeTemplateField = (
  field: Omit<TemplateField, "field_order">,
): TemplateField => field;

const formTemplates: FormTemplate[] = [
  {
    id: "employee-feedback",
    name: "Employee Feedback",
    description: "Collect feedback from employees about workplace satisfaction",
    category: "HR",
    icon: Users,
    fieldCount: 8,
    fieldPresets: [],
    popular: true,
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description: "Register attendees for company events",
    category: "Events",
    icon: Calendar,
    fieldCount: 6,
    fieldPresets: [],
  },
  {
    id: "incident-report",
    name: "Incident Report",
    description: "Report workplace incidents and safety concerns",
    category: "Safety",
    icon: AlertTriangle,
    fieldCount: 10,
    fieldPresets: [],
    popular: true,
  },
  {
    id: "leave-request",
    name: "Leave Request",
    description: "Submit time off and leave requests",
    category: "HR",
    icon: Clock,
    fieldCount: 7,
    fieldPresets: [],
  },
  {
    id: "customer-survey",
    name: "Customer Survey",
    description: "Gather customer feedback and satisfaction ratings",
    category: "Customer",
    icon: Star,
    fieldCount: 12,
    fieldPresets: [],
  },
  {
    id: "training-evaluation",
    name: "Training Evaluation",
    description: "Evaluate training effectiveness and gather feedback",
    category: "Training",
    icon: BookOpen,
    fieldCount: 9,
    fieldPresets: [],
  },
  {
    id: "restaurant-opening-checklist",
    name: "Restaurant Opening Checklist",
    description: "Prep the store, stations, safety checks, and manager signoff before service.",
    category: "Restaurant",
    icon: Clock,
    fieldCount: 4,
    fieldPresets: [
      makeTemplateField({
        field_type: "text",
        label: "Opening manager",
        placeholder: "Name",
        description: null,
        is_required: true,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "checkbox",
        label: "Stations ready",
        placeholder: null,
        description: null,
        is_required: true,
        options: ["Line", "Expo", "Dish", "Prep", "Register"],
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "location",
        label: "Store location confirmation",
        placeholder: null,
        description: null,
        is_required: false,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "signature",
        label: "Manager signoff",
        placeholder: null,
        description: null,
        is_required: true,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
    ],
    popular: true,
  },
  {
    id: "food-safety-temperature-log",
    name: "Food Safety Temperature Log",
    description: "Capture cold holding, hot holding, corrective action, and evidence photos.",
    category: "Restaurant",
    icon: AlertTriangle,
    fieldCount: 4,
    fieldPresets: [
      makeTemplateField({
        field_type: "text",
        label: "Station or unit",
        placeholder: "Walk-in, hot well, prep table",
        description: null,
        is_required: true,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "number",
        label: "Temperature",
        placeholder: "Degrees",
        description: null,
        is_required: true,
        options: null,
        validation_rules: null,
        min_value: -20,
        max_value: 250,
        step_value: 0.1,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "image_upload",
        label: "Evidence photo",
        placeholder: null,
        description: null,
        is_required: false,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: { accepted_types: ["image/*"], max_files: 3, max_size: 10 },
      }),
      makeTemplateField({
        field_type: "textarea",
        label: "Corrective action",
        placeholder: "What changed if temperature was out of range?",
        description: null,
        is_required: false,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
    ],
  },
  {
    id: "retail-inventory-count",
    name: "Retail Inventory Count",
    description: "Scan items, count shelf/backroom stock, rate shelf condition, and attach photos.",
    category: "Retail",
    icon: Star,
    fieldCount: 4,
    fieldPresets: [
      makeTemplateField({
        field_type: "scanner",
        label: "SKU or barcode",
        placeholder: null,
        description: null,
        is_required: true,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: { scan_types: ["barcode", "qr_code"], auto_submit: false },
        media_config: null,
      }),
      makeTemplateField({
        field_type: "number",
        label: "On-hand count",
        placeholder: "Units",
        description: null,
        is_required: true,
        options: null,
        validation_rules: null,
        min_value: 0,
        max_value: null,
        step_value: 1,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "rating",
        label: "Shelf condition",
        placeholder: null,
        description: null,
        is_required: false,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: { max_rating: 5, rating_type: "stars" },
        scan_config: null,
        media_config: null,
      }),
      makeTemplateField({
        field_type: "image_upload",
        label: "Shelf photo",
        placeholder: null,
        description: null,
        is_required: false,
        options: null,
        validation_rules: null,
        min_value: null,
        max_value: null,
        step_value: null,
        formula_expression: null,
        dependent_fields: null,
        rating_config: null,
        scan_config: null,
        media_config: { accepted_types: ["image/*"], max_files: 4, max_size: 10 },
      }),
    ],
  },
];

export default function CreateFormDialog({
  open,
  onOpenChange,
  onFormCreated,
  preferredMethod,
  onPreferredMethodHandled,
}: CreateFormDialogProps) {
  const { createForm, saveFormFields } = useForms();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<CreationStep>("select-method");
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null,
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const resetDialog = () => {
    setCurrentStep("select-method");
    setSelectedTemplate(null);
    setUploadedFile(null);
    setCreating(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const createFormAndStartBuilder = useCallback(
    async (
      title: string = "New Form",
      description: string = "",
      options?: { fromFile?: boolean; templateFields?: TemplateField[] },
    ) => {
      setCreating(true);
      try {
        if (options?.fromFile) {
          if (!uploadedFile) {
            throw new Error("No file selected for import");
          }
          if (!user) {
            throw new Error(
              "You must be signed in to import forms from files.",
            );
          }
          const companyId = profile?.companyId ?? profile?.company_id ?? null;
          if (!companyId) {
            throw new Error("Company context is required to import forms.");
          }

          const { form } = await importFormFromFile(
            uploadedFile,
            user.id,
            companyId,
          );
          setUploadedFile(null);
          onFormCreated?.(form.id);
          resetDialog();
          onOpenChange(false);
          toast({
            title: "Form imported",
            description: `${uploadedFile.name} is ready for refinement.`,
          });
          return;
        }

        const formData = {
          title,
          description: description || undefined,
          departmentid: undefined,
          is_anonymous: false,
        };

        const { data, error } = await createForm(formData);
        if (error || !data) {
          throw error ?? new Error("Failed to create form");
        }

        if (options?.templateFields?.length) {
          const { error: fieldError } = await saveFormFields(
            data.id,
            options.templateFields,
          );
          if (fieldError) {
            throw fieldError;
          }
        }

        onFormCreated?.(data.id);
        resetDialog();
        onOpenChange(false);
      } catch (error) {
        logger.error("Unable to create form", { error, tags: ["error"] });
        toast({
          title: "Form creation failed",
          description:
            error instanceof Error
              ? error.message
              : "Unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setCreating(false);
      }
    },
    [
      createForm,
      onFormCreated,
      onOpenChange,
      profile?.companyId,
      profile?.company_id,
      saveFormFields,
      toast,
      uploadedFile,
      user,
    ],
  );

  useEffect(() => {
    if (!open || !preferredMethod || creating) return;

    if (preferredMethod === "blank") {
      void (async () => {
        await createFormAndStartBuilder();
        onPreferredMethodHandled?.();
      })();
      return;
    }

    if (preferredMethod === "template") {
      setCurrentStep("template-selection");
    } else if (preferredMethod === "upload") {
      setCurrentStep("file-upload");
    }
    onPreferredMethodHandled?.();
  }, [
    open,
    preferredMethod,
    creating,
    createFormAndStartBuilder,
    onPreferredMethodHandled,
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (creating) return;
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const renderMethodSelection = () => {
    const methods: Array<{
      id: string;
      title: string;
      description: string;
      icon: LucideIcon;
      onSelect: () => void;
      badge?: string;
    }> = [
      {
        id: "scratch",
        title: "Start from scratch",
        description: "Create a custom form from the ground up",
        icon: Edit,
        onSelect: () => {
          void createFormAndStartBuilder();
        },
      },
      {
        id: "template",
        title: "Use a template",
        description: "Choose from pre-built form templates",
        icon: FileText,
        onSelect: () => setCurrentStep("template-selection"),
      },
      {
        id: "upload",
        title: "Create from file",
        description: "Upload a document to generate a form",
        icon: Upload,
        badge: "Beta",
        onSelect: () => setCurrentStep("file-upload"),
      },
    ];

    const isDisabled = creating;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">
            How would you like to create your form?
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose the method that works best for you.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((method) => {
            const Icon = method.icon;
            const handleActivate = () => {
              if (isDisabled) return;
              method.onSelect();
            };

            return (
              <Card
                key={method.id}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-disabled={isDisabled}
                className={`relative h-full min-h-[220px] border-2 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  isDisabled
                    ? "pointer-events-none cursor-not-allowed opacity-60"
                    : "hover:border-primary/20 hover:shadow-md"
                }`}
                onClick={handleActivate}
                onKeyDown={(event) => {
                  if (isDisabled) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    method.onSelect();
                  }
                }}
              >
                <CardContent className="flex h-full flex-col items-center gap-4 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold">{method.title}</h4>
                    <CardDescription>{method.description}</CardDescription>
                  </div>
                  {method.badge && (
                    <Badge
                      variant="secondary"
                      className="mt-auto text-xs uppercase tracking-wide"
                    >
                      {method.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep("select-method")}
          disabled={creating}
        >
          ← Back
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Choose a template</h3>
          <p className="text-muted-foreground">
            Select a pre-built form to get started quickly
          </p>
        </div>
      </div>

      <div className="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
        {formTemplates.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className={`cursor-pointer border-2 transition-shadow hover:shadow-md ${
                isSelected ? "border-primary" : "hover:border-primary/20"
              } ${creating ? "pointer-events-none opacity-60" : ""}`}
              onClick={() => {
                if (creating) return;
                setSelectedTemplate(template);
              }}
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  {template.popular && (
                    <Badge variant="secondary" className="text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {template.fieldPresets.length || template.fieldCount} fields
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
            onClick={() =>
              createFormAndStartBuilder(
                selectedTemplate.name,
                selectedTemplate.description,
                { templateFields: selectedTemplate.fieldPresets },
              )
            }
            disabled={creating}
          >
            {creating && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Use &quot;{selectedTemplate.name}&quot; Template
          </Button>
        </div>
      )}
    </div>
  );

  const renderFileUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentStep("select-method")}
          disabled={creating}
        >
          ← Back
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Upload a file</h3>
          <p className="text-muted-foreground">
            Upload a document and we&apos;ll generate a form based on it
          </p>
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
        <label
          htmlFor="file-upload"
          className={`cursor-pointer ${creating ? "pointer-events-none opacity-60" : ""}`}
        >
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-semibold mb-2">Choose a file to upload</h4>
          <p className="text-muted-foreground mb-4">
            Support for PDF, DOC, DOCX, and TXT files
          </p>
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
              createFormAndStartBuilder(
                uploadedFile.name.replace(/\.[^/.]+$/, ""),
                "",
                { fromFile: true },
              )
            }
            disabled={creating}
          >
            {creating && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Continue with File
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="relative flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[900px]">
        <div className="flex max-h-full flex-1 flex-col">
          <DialogHeader className="space-y-2 border-b px-6 py-6">
            <DialogTitle>Create New Form</DialogTitle>
            <DialogDescription>
              Create a new form to collect data from your team or customers.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {currentStep === "select-method" && renderMethodSelection()}
            {currentStep === "template-selection" && renderTemplateSelection()}
            {currentStep === "file-upload" && renderFileUpload()}
          </div>
        </div>

        {creating && (
          <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur">
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
