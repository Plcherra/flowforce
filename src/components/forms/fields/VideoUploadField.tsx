import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Upload, X, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface VideoUploadFieldProps {
  label: string;
  description?: string;
  value?: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
}

export function VideoUploadField({
  label,
  description,
  value = [],
  onChange,
  required = false,
  maxFiles = 3,
  maxSize = 100,
  className = "",
}: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `form-videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("form-videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        logger.error("Upload error:", { error: uploadError, tags: ["error"] });
        return null;
      }

      const { data } = supabase.storage
        .from("form-videos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      logger.error("Error uploading file:", { error, tags: ["error"] });
      return null;
    }
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      // Check file count limit
      if (value.length + files.length > maxFiles) {
        toast({
          title: "Error",
          description: `Maximum ${maxFiles} videos allowed`,
          variant: "destructive",
        });
        return;
      }

      // Check file size and type
      for (const file of files) {
        if (file.size > maxSize * 1024 * 1024) {
          toast({
            title: "Error",
            description: `File ${file.name} is too large. Maximum size is ${maxSize}MB`,
            variant: "destructive",
          });
          return;
        }

        if (!file.type.startsWith("video/")) {
          toast({
            title: "Error",
            description: `File ${file.name} is not a video`,
            variant: "destructive",
          });
          return;
        }
      }

      setUploading(true);

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const results = await Promise.all(uploadPromises);

        const successfulUploads = results.filter(
          (url): url is string => url !== null,
        );
        const failedUploads = results.length - successfulUploads.length;

        if (successfulUploads.length > 0) {
          onChange([...value, ...successfulUploads]);
          toast({
            title: "Success",
            description: `${successfulUploads.length} video(s) uploaded successfully`,
          });
        }

        if (failedUploads > 0) {
          toast({
            title: "Warning",
            description: `${failedUploads} video(s) failed to upload`,
            variant: "destructive",
          });
        }
      } catch (error) {
        logger.error("Error handling file upload:", { error, tags: ["error"] });
        toast({
          title: "Error",
          description: "Failed to upload videos",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [value, onChange, maxFiles, maxSize, uploadFile],
  );

  const removeVideo = useCallback(
    (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);
    },
    [value, onChange],
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((url, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      Video {index + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click to play • Uploaded video
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeVideo(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {value.length < maxFiles && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            {value.length === 0
              ? "No videos uploaded yet"
              : `${value.length} of ${maxFiles} videos uploaded`}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={uploading}
            className="min-w-[120px]"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Videos"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Max {maxFiles} videos, {maxSize}MB each
          </p>
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function VideoUploadFieldPreview({
  label = "Video Upload",
  description = "Upload videos for this form field",
  className = "",
}: Partial<VideoUploadFieldProps>) {
  return (
    <VideoUploadField
      label={label}
      description={description}
      value={[]}
      onChange={() => {}}
      className={className}
    />
  );
}
