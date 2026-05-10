import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Image, Plus, X, Upload, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ImageSelectionData {
  selected_images: string[];
  image_urls: string[];
}

interface ImageSelectionFieldProps {
  label: string;
  description?: string;
  value?: ImageSelectionData;
  onChange: (value: ImageSelectionData | undefined) => void;
  required?: boolean;
  predefinedImages?: string[];
  allowCustomImages?: boolean;
  maxSelection?: number;
  className?: string;
}

export function ImageSelectionField({
  label,
  description,
  value,
  onChange,
  required = false,
  predefinedImages = [],
  allowCustomImages = true,
  maxSelection = 5,
  className = "",
}: ImageSelectionFieldProps) {
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [availableImages, setAvailableImages] =
    useState<string[]>(predefinedImages);

  const selectedImages = value?.selected_images || [];
  const allImages = value?.image_urls || availableImages;

  const addCustomImage = () => {
    if (!customImageUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(customImageUrl);
    } catch {
      toast({
        title: "Error",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
      return;
    }

    const newImages = [...allImages, customImageUrl.trim()];
    setAvailableImages(newImages);

    // Update the field value to include the new image in available images
    const updatedValue: ImageSelectionData = {
      selected_images: selectedImages,
      image_urls: newImages,
    };
    onChange(updatedValue);

    setCustomImageUrl("");

    toast({
      title: "Success",
      description: "Image added successfully",
    });
  };

  const removeCustomImage = (imageUrl: string) => {
    const newImages = allImages.filter((img) => img !== imageUrl);
    const newSelectedImages = selectedImages.filter((img) => img !== imageUrl);

    setAvailableImages(newImages);

    const updatedValue: ImageSelectionData = {
      selected_images: newSelectedImages,
      image_urls: newImages,
    };
    onChange(updatedValue);
  };

  const toggleImageSelection = (imageUrl: string) => {
    let newSelectedImages: string[];

    if (selectedImages.includes(imageUrl)) {
      newSelectedImages = selectedImages.filter((img) => img !== imageUrl);
    } else {
      if (selectedImages.length >= maxSelection) {
        toast({
          title: "Error",
          description: `Maximum ${maxSelection} images can be selected`,
          variant: "destructive",
        });
        return;
      }
      newSelectedImages = [...selectedImages, imageUrl];
    }

    const updatedValue: ImageSelectionData = {
      selected_images: newSelectedImages,
      image_urls: allImages,
    };
    onChange(updatedValue);
  };

  const clearSelection = () => {
    onChange(undefined);
  };

  const isImageSelected = (imageUrl: string) => {
    return selectedImages.includes(imageUrl);
  };

  const getImageName = (url: string) => {
    try {
      return url.split("/").pop()?.split("?")[0] || "Image";
    } catch {
      return "Image";
    }
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

      {selectedImages.length > 0 && (
        <Card className="border-l-4 border-l-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-foreground">
                Selected Images ({selectedImages.length}/{maxSelection})
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((imageUrl, index) => (
                <Badge key={index} variant="secondary" className="px-2 py-1">
                  <Check className="h-3 w-3 mr-1" />
                  {getImageName(imageUrl)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="text-center">
              <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                Select Images ({selectedImages.length}/{maxSelection})
              </p>
            </div>

            {allImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        isImageSelected(imageUrl)
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/20 hover:border-primary/50"
                      }`}
                      onClick={() => toggleImageSelection(imageUrl)}
                    >
                      <div className="aspect-square">
                        <img
                          src={imageUrl}
                          alt={`Option ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSAxMi0zIDMtMyAtMyIgZmlsbD0iIzk0YTNiOCIvPgo8L3N2Zz4K";
                          }}
                        />
                      </div>

                      {isImageSelected(imageUrl) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>

                    {!predefinedImages.includes(imageUrl) && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomImage(imageUrl);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No images available</p>
              </div>
            )}

            {allowCustomImages && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Add Custom Image
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter image URL"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addCustomImage();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomImage}
                    disabled={!customImageUrl.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add images by URL (JPG, PNG, GIF, WebP)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// For form builder preview
export function ImageSelectionFieldPreview({
  label = "Image Selection",
  description = "Select one or more images from the options below",
  className = "",
}: Partial<ImageSelectionFieldProps>) {
  const sampleImages = [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1447433819943-74ca0d7a6ad8?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=150&h=150&fit=crop",
  ];

  return (
    <ImageSelectionField
      label={label}
      description={description}
      value={undefined}
      onChange={() => {}}
      predefinedImages={sampleImages}
      allowCustomImages={true}
      maxSelection={3}
      className={className}
    />
  );
}
