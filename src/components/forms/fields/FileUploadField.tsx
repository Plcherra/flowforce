import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileIcon, Upload, X, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { showErrorToast } from '@/utils/errorHandler';

interface FileUploadData {
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface FileUploadFieldProps {
  label: string;
  description?: string;
  value?: FileUploadData[];
  onChange: (value: FileUploadData[]) => void;
  required?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

export function FileUploadField({
  label,
  description,
  value = [],
  onChange,
  required = false,
  maxFiles = 5,
  maxSize = 25,
  acceptedTypes = [],
  className = ""
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<FileUploadData | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${file.name}`;
      const filePath = `form-uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('form-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        logger.error('File upload error', { error: uploadError, context: { filePath } });
        return null;
      }

      const { data } = supabase.storage
        .from('form-uploads')
        .getPublicUrl(filePath);

      return {
        url: data.publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      logger.error('Error uploading file', { error, context: { fileName: file.name } });
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
        description: `Maximum ${maxFiles} files allowed`,
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

      if (acceptedTypes.length > 0 && !acceptedTypes.some(type => file.type.includes(type))) {
        toast({
          title: "Error",
          description: `File ${file.name} type is not allowed`,
          variant: "destructive",
        });
        return;
      }
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(file => uploadFile(file));
      const results = await Promise.all(uploadPromises);
      
      const successfulUploads = results.filter((data): data is FileUploadData => data !== null);
      const failedUploads = results.length - successfulUploads.length;

      if (successfulUploads.length > 0) {
        onChange([...value, ...successfulUploads]);
        toast({
          title: "Success",
          description: `${successfulUploads.length} file(s) uploaded successfully`,
        });
      }

      if (failedUploads > 0) {
        toast({
          title: "Warning",
          description: `${failedUploads} file(s) failed to upload`,
          variant: "destructive",
        });
      }
    } catch (error) {
      showErrorToast(error, 'file upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [value, onChange, maxFiles, maxSize, acceptedTypes, uploadFile]);

  const removeFile = useCallback((index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  }, [value, onChange]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('document') || type.includes('word')) return '📝';
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📈';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📄';
  };

  const acceptString = acceptedTypes.length > 0 ? acceptedTypes.join(',') : undefined;

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
        accept={acceptString}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((fileData, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg">
                    {getFileIcon(fileData.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {fileData.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileData.size)} • {fileData.type.split('/')[1]?.toUpperCase() || 'File'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(fileData.url, '_blank')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {value.length < maxFiles && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            {value.length === 0 
              ? "No files uploaded yet" 
              : `${value.length} of ${maxFiles} files uploaded`
            }
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={uploading}
            className="min-w-[120px]"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Max {maxFiles} files, {maxSize}MB each
            {acceptedTypes.length > 0 && (
              <span className="block">
                Accepted: {acceptedTypes.join(', ')}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function FileUploadFieldPreview({
  label = "File Upload",
  description = "Upload files for this form field",
  className = ""
}: Partial<FileUploadFieldProps>) {
  return (
    <FileUploadField
      label={label}
      description={description}
      value={[]}
      onChange={() => {}}
      className={className}
    />
  );
}
