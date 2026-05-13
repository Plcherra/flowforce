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
          <DialogTitle>Edit Description Content</DialogTitle>
          <DialogDescription>
            Use the rich text editor to format and style your content.
          </DialogDescription>
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
            Cancel
          </Button>
          <Button onClick={handleSave}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
