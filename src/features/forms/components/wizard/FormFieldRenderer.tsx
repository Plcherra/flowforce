/**
 * Component for rendering form fields based on field type
 */

import React from "react";
import { useForm } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationField } from "@/features/forms/components/fields/LocationField";
import { ImageUploadField } from "@/features/forms/components/fields/ImageUploadField";
import { VideoUploadField } from "@/features/forms/components/fields/VideoUploadField";
import { AudioRecordingField } from "@/features/forms/components/fields/AudioRecordingField";
import { FileUploadField } from "@/features/forms/components/fields/FileUploadField";
import { FormulaField } from "@/features/forms/components/fields/FormulaField";
import { NumberSliderField } from "@/features/forms/components/fields/NumberSliderField";
import { YesNoField } from "@/features/forms/components/fields/YesNoField";
import { DescriptionField } from "@/features/forms/components/fields/DescriptionField";
import { SignatureField } from "@/features/forms/components/fields/SignatureField";
import { RatingField } from "@/features/forms/components/fields/RatingField";
import { ScannerField } from "@/features/forms/components/fields/ScannerField";
import { TaskField } from "@/features/forms/components/fields/TaskField";
import { ImageSelectionField } from "@/features/forms/components/fields/ImageSelectionField";
import type { FormFieldDataLocal } from "../../types/formFill";
import type { FormFieldType } from "@/types/forms";
import type {
  ImageSelectionData,
  LocationData,
  RatingData,
  SignatureData,
  TaskData,
  MediaConfig,
  RatingConfig,
  ScanData,
} from "@/types/forms";
import { getFieldOptions, parseConfig } from "../../utils/formFieldHelpers";

interface FormFieldRendererProps {
  field: FormFieldDataLocal;
  form: ReturnType<typeof useForm>;
}

export function FormFieldRenderer({ field, form }: FormFieldRendererProps) {
  const fieldName = field.id;
  const options = getFieldOptions(field);
  const fieldType = field.field_type as FormFieldType;

  switch (fieldType) {
    case "text":
    case "email":
    case "phone":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                <Input
                  type={
                    fieldType === "email"
                      ? "email"
                      : fieldType === "phone"
                        ? "tel"
                        : "text"
                  }
                  placeholder={field.placeholder || ""}
                  value={String(formField.value || "")}
                  onChange={formField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "textarea":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                <Textarea
                  placeholder={field.placeholder || ""}
                  className="min-h-[120px]"
                  value={String(formField.value || "")}
                  onChange={formField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "number":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                <Input
                  type="number"
                  placeholder={field.placeholder || ""}
                  value={String(formField.value || "")}
                  onChange={formField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "date":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                <Input
                  type="date"
                  value={String(formField.value || "")}
                  onChange={formField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "datetime":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                <Input
                  type="datetime-local"
                  value={String(formField.value || "")}
                  onChange={formField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "select":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <Select
                value={formField.value == null ? "" : String(formField.value)}
                onValueChange={formField.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {options.map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "radio":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required ? "This field is required" : false,
          }}
          render={({ field: formField }) => (
            <FormItem className="space-y-3">
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <FormControl>
                <RadioGroup
                  onValueChange={formField.onChange}
                  value={formField.value == null ? "" : String(formField.value)}
                  className="flex flex-col space-y-1"
                >
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={option}
                        id={`${fieldName}-${index}`}
                      />
                      <label
                        htmlFor={`${fieldName}-${index}`}
                        className="text-sm font-normal"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "checkbox":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          rules={{
            required: field.is_required
              ? "Please select at least one option"
              : false,
          }}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>
                {field.label}
                {field.is_required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </FormLabel>
              {field.description && (
                <FormDescription>{field.description}</FormDescription>
              )}
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      checked={
                        Array.isArray(formField.value) &&
                        formField.value.includes(option)
                      }
                      onCheckedChange={(checked) => {
                        const current = Array.isArray(formField.value)
                          ? formField.value
                          : [];
                        if (checked) {
                          formField.onChange([...current, option]);
                        } else {
                          formField.onChange(
                            current.filter((value) => value !== option),
                          );
                        }
                      }}
                    />
                    <span>{option}</span>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "file":
    case "file_upload": {
      const fileConfig = parseConfig<MediaConfig>(field.media_config, {});
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FileUploadField
                label={field.label}
                description={field.description}
                value={Array.isArray(formField.value) ? formField.value : []}
                onChange={formField.onChange}
                maxFiles={fileConfig.max_files ?? 5}
                maxSize={fileConfig.max_size ?? 10}
                acceptedTypes={fileConfig.accepted_types}
              />
            </FormItem>
          )}
        />
      );
    }

    case "image_upload": {
      const imageConfig = parseConfig<MediaConfig>(field.media_config, {});
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <ImageUploadField
                label={field.label}
                description={field.description}
                value={Array.isArray(formField.value) ? formField.value : []}
                onChange={formField.onChange}
                maxFiles={imageConfig.max_files ?? 5}
                maxSize={imageConfig.max_size ?? 10}
              />
            </FormItem>
          )}
        />
      );
    }

    case "video_upload": {
      const videoConfig = parseConfig<MediaConfig>(field.media_config, {});
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <VideoUploadField
                label={field.label}
                description={field.description}
                value={Array.isArray(formField.value) ? formField.value : []}
                onChange={formField.onChange}
                maxFiles={videoConfig.max_files ?? 3}
                maxSize={videoConfig.max_size ?? 50}
              />
            </FormItem>
          )}
        />
      );
    }

    case "audio_recording": {
      const audioConfig = parseConfig<MediaConfig>(field.media_config, {});
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <AudioRecordingField
                label={field.label}
                description={field.description}
                value={Array.isArray(formField.value) ? formField.value : []}
                onChange={formField.onChange}
                maxRecordings={audioConfig.max_files ?? 3}
                maxDuration={300}
              />
            </FormItem>
          )}
        />
      );
    }

    case "signature":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <SignatureField
                label={field.label}
                description={field.description}
                value={formField.value as SignatureData | undefined}
                onChange={formField.onChange}
                required={field.is_required || false}
              />
            </FormItem>
          )}
        />
      );

    case "rating": {
      const ratingConfig = parseConfig<RatingConfig>(field.rating_config, {
        max_rating: 5,
        rating_type: "stars",
      });
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <RatingField
                label={field.label}
                description={field.description}
                value={formField.value as RatingData | undefined}
                config={ratingConfig}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );
    }

    case "location":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <LocationField
                label={field.label}
                description={field.description}
                value={formField.value as LocationData | null}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case "scanner":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <ScannerField
                label={field.label}
                description={field.description}
                value={formField.value as ScanData | null}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case "task":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <TaskField
                label={field.label}
                description={field.description}
                value={formField.value as TaskData}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case "image_selection":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <ImageSelectionField
                label={field.label}
                description={field.description}
                value={formField.value as ImageSelectionData | undefined}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case "description":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={() => (
            <FormItem>
              <DescriptionField
                label={field.label}
                content={field.description ?? ""}
              />
            </FormItem>
          )}
        />
      );

    case "formula":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <FormulaField
                label={field.label}
                description={field.description}
                value={formField.value as number}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    case "number_slider":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <NumberSliderField
                label={field.label}
                description={field.description}
                value={Number(formField.value) || 0}
                onChange={formField.onChange}
                min={field.min_value ?? 0}
                max={field.max_value ?? 100}
                step={field.step_value ?? 1}
              />
            </FormItem>
          )}
        />
      );

    case "yes_no":
      return (
        <FormField
          key={field.id}
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem>
              <YesNoField
                label={field.label}
                description={field.description}
                value={formField.value as boolean | null}
                onChange={formField.onChange}
              />
            </FormItem>
          )}
        />
      );

    default:
      return null;
  }
}
