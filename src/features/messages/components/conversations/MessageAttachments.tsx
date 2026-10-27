import { useTranslation } from "react-i18next";
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip, X, File, Image, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import type { MessageAttachment } from "@/types/messages";
import { logger } from "@/utils/logger";
import {
  buildCompanyStoragePath,
  resolveProfileCompanyId,
} from "@/lib/storagePaths";
import { openSignedStorageUrl } from "@/lib/signedStorageUrls";

const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || !user || !messageId) return;
    const companyId = resolveProfileCompanyId(profile);

    if (!companyId) {
      toast({
        title: t("messages.missingCompany"),
        description: t("messages.accountNotAttached"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const newAttachments: MessageAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = buildCompanyStoragePath(
          companyId,
          `messages/${messageId}`,
          file.name,
        );

        const { data, error } = await supabase.storage
          .from(MESSAGE_ATTACHMENTS_BUCKET)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          path: data.path,
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      const updatedAttachments = [...attachments, ...newAttachments];
      onAttachmentsChange?.(updatedAttachments);

      toast({
        title: t("messages.filesUploaded", { count: newAttachments.length }),
      });
    } catch (error) {
      logger.error("Upload error", { error, tags: ["error"] });
      toast({
        title: t("common.somethingWentWrong"),
        description: t("messages.uploadFailed"),
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
          .from(MESSAGE_ATTACHMENTS_BUCKET)
          .remove([attachment.path]);
      }

      const updatedAttachments = attachments.filter(
        (a) => a.id !== attachment.id,
      );
      onAttachmentsChange?.(updatedAttachments);

      toast({
        title: t("messages.fileRemoved"),
      });
    } catch (error) {
      logger.error("Remove error", { error, tags: ["error"] });
      toast({
        title: t("common.somethingWentWrong"),
        description: t("messages.fileRemoveFailed"),
        variant: "destructive",
      });
    }
  };

  const downloadAttachment = async (attachment: MessageAttachment) => {
    try {
      if (attachment.path) {
        const { data, error } = await supabase.storage
          .from(MESSAGE_ATTACHMENTS_BUCKET)
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
        return;
      }

      if (attachment.url) {
        window.open(attachment.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      logger.error("Download error", { error, tags: ["error"] });
      toast({
        title: t("common.somethingWentWrong"),
        description: t("messages.downloadFailed"),
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

  const previewAttachment = async (attachment: MessageAttachment) => {
    try {
      if (attachment.path) {
        await openSignedStorageUrl(MESSAGE_ATTACHMENTS_BUCKET, attachment.path);
        return;
      }

      if (attachment.url) {
        window.open(attachment.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      logger.error("Preview error", { error, tags: ["error"] });
      toast({
        title: t("common.somethingWentWrong"),
        description: t("messages.previewFailed"),
        variant: "destructive",
      });
    }
  };

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
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
            aria-label={t("messages.attachFile")}
          >
            <Paperclip className="h-4 w-4" />
            {uploading ? t("messages.uploadingFiles") : t("messages.attachFile")}
          </Button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <Card>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("messages.uploadingFiles")}</span>
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
                        <Image className="h-5 w-5 text-primary" />
                      ) : (
                        <File className="h-5 w-5 text-muted-foreground" />
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
                    {isImage(attachment.type) &&
                      (attachment.path || attachment.url) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={attachment.name}
                          onClick={() => void previewAttachment(attachment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                    {/* Download button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label={attachment.name}
                      onClick={() => downloadAttachment(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* Remove button (only if not read-only) */}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                        aria-label={attachment.name}
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
