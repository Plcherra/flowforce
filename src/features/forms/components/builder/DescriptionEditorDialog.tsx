import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichTextContentEditor } from "@/features/forms/components/builder/RichTextContentEditor";

interface DescriptionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onSave: (content: string) => void;
}

export function DescriptionEditorDialog({
  open,
  onOpenChange,
  content,
  onSave,
}: DescriptionEditorDialogProps) {
  const { t } = useTranslation();
  const [editorContent, setEditorContent] = useState(content);

  useEffect(() => {
    setEditorContent(content);
  }, [content, open]);

  const handleSave = () => {
    onSave(editorContent);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("forms.editDescriptionContent")}</DialogTitle>
          <DialogDescription>
            {t("forms.useTheRichTextEditorToFormatAndStyleYourContent")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          <RichTextContentEditor
            value={editorContent}
            onChange={setEditorContent}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}</Button>
          <Button onClick={handleSave}>{t("forms.confirm")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
