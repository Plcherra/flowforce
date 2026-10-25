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
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { importFormFromFile } from "@/features/forms/services/formImportService";
import { deleteFormRow } from "@/features/forms/repositories/formsRepository";
import { formTemplates, type TemplateField } from "@/features/forms/utils/formTemplates";
import { logger } from "@/utils/logger";

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormCreated?: (formId: string, meta?: { discardIfEmpty?: boolean }) => void;
  preferredMethod?: "blank" | "template" | "upload";
  onPreferredMethodHandled?: () => void;
}

const templateIcons: Record<string, LucideIcon> = {
  "employee-feedback": Users,
  "event-registration": Calendar,
  "incident-report": AlertTriangle,
  "leave-request": Clock,
  "customer-survey": Star,
  "training-evaluation": BookOpen,
  "restaurant-opening-checklist": Clock,
  "food-safety-temperature-log": AlertTriangle,
  "retail-inventory-count": Star,
};


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
            const companyId = profile?.companyId ?? profile?.company_id ?? null;
            if (companyId) {
              await deleteFormRow(companyId, data.id).catch(() => undefined);
            }
            throw fieldError;
          }
        }

        onFormCreated?.(data.id, {
          discardIfEmpty: !options?.templateFields?.length,
        });
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
                  const Icon = templateIcons[template.id] ?? FileText;
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
                            { templateFields: template.fields },
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
