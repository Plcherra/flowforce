import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link,
  Image,
  Type,
  Palette,
  Undo2,
  Redo2,
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

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
  const [fontSize, setFontSize] = useState("14px");

  useEffect(() => {
    setEditorContent(content);
  }, [content, open]);

  const handleSave = () => {
    onSave(editorContent);
    onOpenChange(false);
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
        ["undo", "redo"],
      ],
    },
    history: {
      delay: 1000,
      maxStack: 50,
      userOnly: false,
    },
  };

  const quillFormats = [
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "list",
    "bullet",
    "link",
    "image",
    "clean",
  ];

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
          {/* Custom Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 border rounded-lg bg-muted/20">
            {/* Font Size */}
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12px">12px</SelectItem>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="20px">20px</SelectItem>
                <SelectItem value="24px">24px</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Text Formatting */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Underline className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Strikethrough className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Text Colors */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Type className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Palette className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Alignment */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignJustify className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Lists */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Insert */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Image className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Undo/Redo */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1 border rounded-lg overflow-hidden">
            <ReactQuill
              value={editorContent}
              onChange={setEditorContent}
              modules={quillModules}
              formats={quillFormats}
              theme="snow"
              className="h-full"
              style={{
                height: "calc(100% - 42px)", // Account for toolbar height
                fontSize: fontSize,
              }}
            />
          </div>
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
