import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Edit3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";
import { RichTextContentEditor } from "@/features/forms/components/builder/RichTextContentEditor";

interface DescriptionFieldProps {
  label: string;
  description?: string;
  content?: string;
  className?: string;
  isEditing?: boolean;
  onContentChange?: (content: string) => void;
}

export function DescriptionField({
  label,
  description,
  content = "",
  className = "",
  isEditing = false,
  onContentChange,
}: DescriptionFieldProps) {
  const [editMode, setEditMode] = useState(isEditing);
  const [currentContent, setCurrentContent] = useState(content);

  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  const handleContentChange = (value: string) => {
    setCurrentContent(value);
    onContentChange?.(value);
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  return (
    <Card className={`border-l-4 border-l-primary/20 ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-foreground">{label}</h4>
              {onContentChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleEditMode}
                  className="h-8 px-2"
                >
                  {editMode ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mb-3">
                {description}
              </p>
            )}
            {editMode ? (
              <div className="mt-3">
                <RichTextContentEditor
                  value={currentContent}
                  onChange={handleContentChange}
                />
              </div>
            ) : (
              currentContent && (
                <div
                  className="prose prose-sm max-w-none text-foreground mt-3"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(currentContent),
                  }}
                />
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// For form builder preview
export function DescriptionFieldPreview({
  label: label = "Information",
  description: description = "This is a description field that can contain important information or instructions.",
  content = "<p>You can use <strong>rich text formatting</strong> including:</p><ul><li>Bullet points</li><li><em>Italics</em> and <strong>bold text</strong></li><li>Links and other HTML elements</li></ul>",
  className = "",
}: Partial<DescriptionFieldProps>) {
  return (
    <div
      className={`p-4 border-l-4 border-l-primary/20 bg-card rounded-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          {content && (
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(content),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
