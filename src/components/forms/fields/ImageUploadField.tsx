import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Upload, X, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadFieldProps {
  label: string;
  description?: string;
  value?: string[];
  onChange: (value: string[]) => void;
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
  className = ""
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `form-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('form-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('form-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      if (!file.type.startsWith('image/')) {
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
      const uploadPromises = files.map(file => uploadFile(file));
      const results = await Promise.all(uploadPromises);
      
      const successfulUploads = results.filter((url): url is string => url !== null);
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
      console.error('Error handling file upload:', error);
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [value, onChange, maxFiles, maxSize, uploadFile]);

  const removeImage = useCallback((index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  }, [value, onChange]);

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
          {value.map((url, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
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
              : `${value.length} of ${maxFiles} images uploaded`
            }
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

// For form builder preview
export function ImageUploadFieldPreview({
  label = "Image Upload",
  description = "Upload images for this form field",
  className = ""
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