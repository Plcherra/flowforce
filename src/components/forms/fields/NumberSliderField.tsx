import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface NumberSliderFieldProps {
  label: string;
  description?: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  showInput?: boolean;
  showLabels?: boolean;
  unit?: string;
  onChange?: (value: number) => void;
  className?: string;
}

export function NumberSliderField({
  label,
  description,
  value = 50,
  min = 0,
  max = 100,
  step = 1,
  required = false,
  showInput = true,
  showLabels = true,
  unit = "",
  onChange,
  className = ""
}: NumberSliderFieldProps) {
  const [currentValue, setCurrentValue] = useState(value);

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      setCurrentValue(newValue);
      onChange?.(newValue);
    }
  };

  const formatValue = (val: number) => {
    return unit ? `${val}${unit}` : val.toString();
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={`slider-${label}`}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {showInput && (
          <Input
            id={`slider-input-${label}`}
            type="number"
            value={currentValue}
            min={min}
            max={max}
            step={step}
            onChange={handleInputChange}
            className="w-20 h-8 text-center"
          />
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      )}

      <Card className="p-4">
        <CardContent className="p-0">
          <div className="space-y-4">
            {/* Current value display */}
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">
                {formatValue(currentValue)}
              </span>
            </div>

            {/* Slider */}
            <div className="px-2">
              <Slider
                id={`slider-${label}`}
                value={[currentValue]}
                min={min}
                max={max}
                step={step}
                onValueChange={handleSliderChange}
                className="w-full"
              />
            </div>

            {/* Min/Max labels */}
            {showLabels && (
              <div className="flex justify-between text-xs text-muted-foreground px-2">
                <span>{formatValue(min)}</span>
                <span>{formatValue(max)}</span>
              </div>
            )}

            {/* Percentage indicator */}
            <div className="w-full bg-muted rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-200"
                style={{
                  width: `${((currentValue - min) / (max - min)) * 100}%`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// For form builder preview
export function NumberSliderFieldPreview({
  label = "Rating Scale",
  description = "Select a value using the slider",
  className = ""
}: Partial<NumberSliderFieldProps>) {
  return (
    <NumberSliderField
      label={label}
      description={description}
      value={75}
      min={0}
      max={100}
      step={5}
      unit="%"
      showInput={true}
      showLabels={true}
      className={className}
    />
  );
}