import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";
import {
  buildCompanyStoragePath,
  resolveProfileCompanyId,
} from "@/lib/storagePaths";
import { createSignedStorageUrl } from "@/lib/signedStorageUrls";
import {
  getStorageObjectUrl,
  isStorageObjectReference,
  type StorageObjectReference,
  type StorageObjectValue,
} from "@/lib/storageObjects";

type ImageUploadValue = StorageObjectValue;

interface ImageUploadFieldProps {
  label: string;
  description?: string;
  value?: ImageUploadValue[];
  onChange: (value: ImageUploadValue[]) => void;
  required?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
}

export function ImageUploadField({
  label,
  description,
  value = [],
  onChange,
  required = false,
  maxFiles = 5,
  maxSize = 10,
  className = "",
}: ImageUploadFieldProps) {
  const { profile } = useProfile();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<StorageObjectReference | null> => {
    try {
      const companyId = resolveProfileCompanyId(profile);
      if (!companyId) {
        throw new Error("Your account is not attached to a company yet.");
      }

      const filePath = buildCompanyStoragePath(
        companyId,
        "forms/images",
        file.name,
      );

      const { error: uploadError } = await supabase.storage
        .from("form-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        logger.error("Upload error:", { error: uploadError, tags: ["error"] });
        return null;
      }

      return {
        bucket: "form-images",
        path: filePath,
        name: file.name,
        type: file.type,
        size: file.size,
      };
    } catch (error) {
      logger.error("Error uploading file:", { error, tags: ["error"] });
      return null;
    }
  }, [profile]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      // Check file count limit
      if (value.length + files.length > maxFiles) {
        toast({
          title: "Error",
          description: `Maximum ${maxFiles} images allowed`,
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

        if (!file.type.startsWith("image/")) {
          toast({
            title: "Error",
            description: `File ${file.name} is not an image`,
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
          (item): item is StorageObjectReference => item !== null,
        );
        const failedUploads = results.length - successfulUploads.length;

        if (successfulUploads.length > 0) {
          onChange([...value, ...successfulUploads]);
          toast({
            title: "Success",
            description: `${successfulUploads.length} image(s) uploaded successfully`,
          });
        }

        if (failedUploads > 0) {
          toast({
            title: "Warning",
            description: `${failedUploads} image(s) failed to upload`,
            variant: "destructive",
          });
        }
      } catch (error) {
        logger.error("Error handling file upload:", { error, tags: ["error"] });
        toast({
          title: "Error",
          description: "Failed to upload images",
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

  const removeImage = useCallback(
    (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);
    },
    [value, onChange],
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((item, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <SignedImagePreview
                    value={item}
                    alt={`Upload ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
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
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            {value.length === 0
              ? "No images uploaded yet"
              : `${value.length} of ${maxFiles} images uploaded`}
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={openFileDialog}
              disabled={uploading}
              className="min-w-[120px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Images"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Max {maxFiles} images, {maxSize}MB each
          </p>
        </div>
      )}
    </div>
  );
}

function SignedImagePreview({
  value,
  alt,
}: {
  value: ImageUploadValue;
  alt: string;
}) {
  const [src, setSrc] = useState<string | null>(() => getStorageObjectUrl(value));

  React.useEffect(() => {
    let cancelled = false;
    const url = getStorageObjectUrl(value);
    if (url) {
      setSrc(url);
      return;
    }

    if (!isStorageObjectReference(value)) {
      setSrc(null);
      return;
    }

    createSignedStorageUrl(value.bucket, value.path, { expiresIn: 300 })
      .then((signedUrl) => {
        if (!cancelled) setSrc(signedUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className="h-full w-full bg-muted" />;
  }

  return <img src={src} alt={alt} className="w-full h-full object-cover" />;
}

// For form builder preview
export function ImageUploadFieldPreview({
  label = "Image Upload",
  description = "Upload images for this form field",
  className = "",
}: Partial<ImageUploadFieldProps>) {
  return (
    <ImageUploadField
      label={label}
      description={description}
      value={[]}
      onChange={() => {}}
      className={className}
    />
  );
}
