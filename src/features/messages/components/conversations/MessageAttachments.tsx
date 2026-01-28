import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip, X, File, Image, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { MessageAttachment } from "@/types/messages";
import { logger } from "@/utils/logger";

interface MessageAttachmentsProps {
  messageId?: string;
  attachments?: MessageAttachment[];
  onAttachmentsChange?: (attachments: MessageAttachment[]) => void;
  readOnly?: boolean;
}

export function MessageAttachments({
  messageId,
  attachments = [],
  onAttachmentsChange,
  readOnly = false,
}: MessageAttachmentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || !user || !messageId) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const newAttachments: MessageAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${messageId}/${crypto.randomUUID()}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from("message-attachments")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("message-attachments")
          .getPublicUrl(data.path);

        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: urlData.publicUrl,
          path: data.path,
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      const updatedAttachments = [...attachments, ...newAttachments];
      onAttachmentsChange?.(updatedAttachments);

      toast({
        title: "Success",
        description: `${newAttachments.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      logger.error("Upload error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = async (attachment: MessageAttachment) => {
    try {
      // Remove from storage if it has a path
      if (attachment.path) {
        await supabase.storage
          .from("message-attachments")
          .remove([attachment.path]);
      }

      const updatedAttachments = attachments.filter(
        (a) => a.id !== attachment.id,
      );
      onAttachmentsChange?.(updatedAttachments);

      toast({
        title: "Success",
        description: "File removed successfully",
      });
    } catch (error) {
      logger.error("Remove error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to remove file",
        variant: "destructive",
      });
    }
  };

  const downloadAttachment = async (attachment: MessageAttachment) => {
    try {
      if (attachment.path) {
        const { data, error } = await supabase.storage
          .from("message-attachments")
          .download(attachment.path);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      logger.error("Download error", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className="space-y-2">
      {/* Upload button (only if not read-only) */}
      {!readOnly && messageId && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Paperclip className="h-4 w-4" />
            {uploading ? "Uploading..." : "Attach Files"}
          </Button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading files...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="border border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {isImage(attachment.type) ? (
                        <Image className="h-5 w-5 text-blue-500" />
                      ) : (
                        <File className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Preview button for images */}
                    {isImage(attachment.type) && attachment.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(attachment.url, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Download button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => downloadAttachment(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* Remove button (only if not read-only) */}
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeAttachment(attachment)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
