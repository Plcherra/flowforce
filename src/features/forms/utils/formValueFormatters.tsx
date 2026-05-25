/**
 * Utility functions for formatting form field values for display
 */

import React from "react";
import type { FormFieldType } from "@/types/forms";
import type {
  ImageSelectionData,
  LocationData,
  RatingData,
  SignatureData,
  TaskData,
} from "@/types/forms";
import {
  getStorageObjectName,
  isStorageObjectReference,
  type StorageObjectValue,
} from "@/lib/storageObjects";

/**
 * Format attachment value for display
 */
export function formatAttachmentValue(value: unknown): React.ReactNode {
  if (value == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">No files</span>;
    }
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="text-sm">
            {typeof item === "string" || isStorageObjectReference(item)
              ? getStorageObjectName(item as StorageObjectValue)
              : String(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("url" in obj && typeof obj.url === "string") {
      return <span className="text-sm">{obj.url}</span>;
    }
    if (isStorageObjectReference(value)) {
      return <span className="text-sm">{getStorageObjectName(value)}</span>;
    }
    return <span className="text-sm">{JSON.stringify(value)}</span>;
  }

  return <span className="text-sm">{String(value)}</span>;
}

/**
 * Format list value for display
 */
export function formatListValue(value: unknown[]): React.ReactNode {
  if (value.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-1">
      {value.map((item, index) => (
        <div key={index} className="text-sm">
          {String(item)}
        </div>
      ))}
    </div>
  );
}

/**
 * Get default value for a form field based on its type
 */
export function getDefaultValueForField(
  fieldType: FormFieldType,
  minValue?: number | null,
): unknown {
  switch (fieldType) {
    case "checkbox":
      return [];
    case "radio":
    case "select":
      return "";
    case "number":
    case "number_slider":
      return minValue ?? 0;
    case "date":
    case "datetime":
      return "";
    case "file":
    case "file_upload":
      return [];
    case "yes_no":
      return null;
    case "location":
      return null;
    case "image_upload":
    case "video_upload":
    case "audio_recording":
      return [];
    case "signature":
      return null;
    case "rating":
      return {
        rating_value: 0,
        max_rating: 5,
        rating_type: "stars" as const,
      } satisfies RatingData;
    case "scanner":
      return null;
    case "task":
      return {
        task_title: "",
        priority: "medium" as const,
        status: "pending" as const,
        created_at: new Date().toISOString(),
      } satisfies TaskData;
    case "image_selection":
      return {
        selected_images: [],
        image_urls: [],
      } as ImageSelectionData;
    case "formula":
      return 0;
    case "description":
      return "";
    default:
      return "";
  }
}
