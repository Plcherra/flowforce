import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Star,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useForms } from "@/features/forms/hooks/useForms";
import type { FormFieldRow } from "@/features/forms/hooks/useForms";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
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
  const { t, i18n } = useTranslation();
  const { createForm, saveFormFields } = useForms();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setTitle("");
    setCreating(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      options?: { file?: File; templateFields?: TemplateField[] },
    ) => {
      setCreating(true);
      try {
        const importedFile = options?.file;
        if (importedFile) {
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
            importedFile,
            user.id,
            companyId,
            appLanguageFromTag(i18n.resolvedLanguage || i18n.language),
          );
          onFormCreated?.(form.id);
          resetDialog();
          onOpenChange(false);
          toast({
            title: t("forms.formImported"),
            description: t("forms.fileReadyToEdit", { name: importedFile.name }),
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
      i18n,
      onFormCreated,
      onOpenChange,
      profile?.companyId,
      profile?.company_id,
      saveFormFields,
      t,
      toast,
      user,
    ],
  );

  useEffect(() => {
    if (!open || preferredMethod !== "blank" || creating) return;
    void (async () => {
      await createFormAndStartBuilder();
      onPreferredMethodHandled?.();
    })();
  }, [
    open,
    preferredMethod,
    creating,
    createFormAndStartBuilder,
    onPreferredMethodHandled,
  ]);

  useEffect(() => {
    if (!open || preferredMethod !== "upload") return;
    fileInputRef.current?.click();
    onPreferredMethodHandled?.();
  }, [open, preferredMethod, onPreferredMethodHandled]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (creating) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const importedTitle = file.name.replace(/\.[^/.]+$/, "");
    void createFormAndStartBuilder(title.trim() || importedTitle, "", { file });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="top-4 flex max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-1.5rem))] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-[40rem]">
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="space-y-1 border-b px-4 py-3">
            <DialogTitle>{t("forms.createNewForm")}</DialogTitle>
            <DialogDescription>
              {t("forms.createFormDirectlyHelp")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="new-form-title">{t("forms.formTitle")}</Label>
              <Input
                id="new-form-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("forms.enterFormTitle")}
                disabled={creating}
              />
              <Button
                type="button"
                className="min-h-11"
                disabled={creating}
                onClick={() =>
                  void createFormAndStartBuilder(title.trim() || t("forms.newForm"))
                }
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {t("forms.createForm")}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("forms.templates")}</h3>
              <ul className="divide-y rounded-md border">
                {formTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <li key={template.id} className="flex items-center gap-2 px-3 py-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{template.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      {template.popular ? (
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                          {t("forms.popular")}
                        </Badge>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-11 shrink-0"
                        disabled={creating}
                        onClick={() =>
                          void createFormAndStartBuilder(
                            template.name,
                            template.description,
                            { templateFields: template.fieldPresets },
                          )
                        }
                      >
                        {t("forms.loadTemplate")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("forms.importFromFile")}</h3>
              <p className="text-xs text-muted-foreground">{t("forms.importFileTypes")}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleFileUpload}
                disabled={creating}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={creating}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("forms.importFromFile")}
              </Button>
            </div>
          </div>
        </div>

        {creating && (
          <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("forms.preparingYourForm")}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
