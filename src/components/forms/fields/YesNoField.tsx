import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, CheckCircle, XCircle } from "lucide-react";

interface YesNoFieldProps {
  label: string;
  description?: string;
  value?: boolean | null;
  required?: boolean;
  variant?: "switch" | "buttons" | "cards";
  yesLabel?: string;
  noLabel?: string;
  onChange?: (value: boolean | null) => void;
  className?: string;
}

export function YesNoField({
  label,
  description,
  value = null,
  required = false,
  variant = "switch",
  yesLabel = "Yes",
  noLabel = "No",
  onChange,
  className = "",
}: YesNoFieldProps) {
  const [currentValue, setCurrentValue] = useState<boolean | null>(value);

  const handleChange = (newValue: boolean | null) => {
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  const renderSwitch = () => (
    <div className="flex items-center space-x-3">
      <Switch
        id={`yesno-${label}`}
        checked={currentValue === true}
        onCheckedChange={(checked) => handleChange(checked)}
      />
      <Label htmlFor={`yesno-${label}`} className="text-sm">
        {currentValue === true
          ? yesLabel
          : currentValue === false
            ? noLabel
            : "Select an option"}
      </Label>
    </div>
  );

  const renderButtons = () => (
    <div className="flex gap-3">
      <Button
        type="button"
        variant={currentValue === true ? "default" : "outline"}
        onClick={() => handleChange(true)}
        className="flex-1"
      >
        <Check className="h-4 w-4 mr-2" />
        {yesLabel}
      </Button>
      <Button
        type="button"
        variant={currentValue === false ? "default" : "outline"}
        onClick={() => handleChange(false)}
        className="flex-1"
      >
        <X className="h-4 w-4 mr-2" />
        {noLabel}
      </Button>
    </div>
  );

  const renderCards = () => (
    <div className="grid grid-cols-2 gap-3">
      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          currentValue === true
            ? "ring-2 ring-primary bg-primary/5"
            : "hover:bg-muted/50"
        }`}
        onClick={() => handleChange(true)}
      >
        <CardContent className="p-4 text-center">
          <CheckCircle
            className={`h-8 w-8 mx-auto mb-2 ${
              currentValue === true ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span className="font-medium">{yesLabel}</span>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          currentValue === false
            ? "ring-2 ring-primary bg-primary/5"
            : "hover:bg-muted/50"
        }`}
        onClick={() => handleChange(false)}
      >
        <CardContent className="p-4 text-center">
          <XCircle
            className={`h-8 w-8 mx-auto mb-2 ${
              currentValue === false ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span className="font-medium">{noLabel}</span>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={className}>
      <Label className="text-base font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {description && (
        <p className="text-sm text-muted-foreground mt-1 mb-4">{description}</p>
      )}

      <div className="mt-3">
        {variant === "switch" && renderSwitch()}
        {variant === "buttons" && renderButtons()}
        {variant === "cards" && renderCards()}
      </div>

      {/* Clear selection option for non-required fields */}
      {!required && currentValue !== null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleChange(null)}
          className="mt-2 text-xs"
        >
          Clear selection
        </Button>
      )}
    </div>
  );
}

// For form builder preview
export function YesNoFieldPreview({
  label = "Do you agree to the terms?",
  description = "Please select yes or no",
  variant = "cards",
  className = "",
}: Partial<YesNoFieldProps>) {
  return (
    <YesNoField
      label={label}
      description={description}
      variant={variant}
      value={true}
      className={className}
    />
  );
}
