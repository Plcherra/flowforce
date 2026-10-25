import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useForms } from "@/features/forms/hooks/useForms";
import { canPublishForm } from "@/features/forms/utils/formLifecycle";

export function useFormListActions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { deleteForm, updateForm, getFormFields } = useForms();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const publishForm = async (formId: string) => {
    const { data, error } = await getFormFields(formId);
    if (error || !canPublishForm(data?.length ?? 0)) {
      toast({
        title: t("forms.addAFieldBeforePublish"),
        variant: "destructive",
      });
      return;
    }
    const result = await updateForm(formId, { status: "published" }, { quiet: true });
    if (!result.error) {
      toast({ title: t("forms.formPublished"), description: t("forms.formPublishedHelp") });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setPending(true);
    try {
      await deleteForm(deleteId);
      setDeleteId(null);
    } finally {
      setPending(false);
    }
  };

  return {
    deleteId,
    setDeleteId,
    pending,
    publishForm,
    confirmDelete,
  };
}
