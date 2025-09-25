import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Info, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface FormulaFieldProps {
  label: string;
  description?: string;
  formula?: string;
  formData?: Record<string, any>;
  availableFields?: Array<{ label: string; name: string; type: string }>;
  required?: boolean;
  placeholder?: string;
  onChange?: (value: number | null) => void;
  onFormulaChange?: (formula: string) => void;
  isBuilding?: boolean;
  className?: string;
}

interface FormulaElement {
  type: 'field' | 'operator' | 'number';
  value: string;
  fieldName?: string;
  multiplier?: number;
}

export function FormulaField({
  label,
  description,
  formula = "",
  formData = {},
  availableFields = [],
  required = false,
  placeholder = "Calculated automatically",
  onChange,
  onFormulaChange,
  isBuilding = false,
  className = ""
}: FormulaFieldProps) {
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [formulaElements, setFormulaElements] = useState<FormulaElement[]>([]);
  const [showBuilder, setShowBuilder] = useState(isBuilding);

  // Simple formula evaluation function
  const evaluateFormula = (expr: string, data: Record<string, any>): number | null => {
    try {
      let processedFormula = expr;
      
      // Replace field references with actual values
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
          processedFormula = processedFormula.replace(
            new RegExp(`\\{${key}\\}`, 'g'), 
            String(Number(value))
          );
        }
      });

      // Basic arithmetic operations only
      if (!/^[0-9+\-*/().\s]+$/.test(processedFormula)) {
        throw new Error("Invalid characters in formula");
      }

      // Use Function constructor for safe evaluation (limited to arithmetic)
      const result = new Function(`"use strict"; return (${processedFormula})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error("Formula result is not a valid number");
      }

      return Math.round(result * 100) / 100; // Round to 2 decimal places
    } catch (err) {
      throw new Error("Invalid formula");
    }
  };

  // Parse formula into elements for visual builder
  useEffect(() => {
    if (formula && isBuilding) {
      parseFormulaToElements(formula);
    }
  }, [formula, isBuilding]);

  useEffect(() => {
    if (formula && Object.keys(formData).length > 0) {
      try {
        const result = evaluateFormula(formula, formData);
        setCalculatedValue(result);
        setError("");
        onChange?.(result);
      } catch (err) {
        setCalculatedValue(null);
        setError(err instanceof Error ? err.message : "Calculation error");
        onChange?.(null);
      }
    }
  }, [formula, formData, onChange]);

  const parseFormulaToElements = (formulaStr: string) => {
    const elements: FormulaElement[] = [];
    const tokens = formulaStr.split(/(\+|\-|\*|\/|\(|\))/).filter(token => token.trim());
    
    tokens.forEach(token => {
      const trimmed = token.trim();
      if (trimmed.match(/^\{.*\}$/)) {
        // Field reference
        const fieldName = trimmed.slice(1, -1);
        const field = availableFields.find(f => f.name === fieldName);
        elements.push({
          type: 'field',
          value: field?.label || fieldName,
          fieldName: fieldName
        });
      } else if (trimmed.match(/^[\+\-\*\/]$/)) {
        elements.push({ type: 'operator', value: trimmed });
      } else if (trimmed.match(/^\d+(\.\d+)?$/)) {
        elements.push({ type: 'number', value: trimmed });
      }
    });
    
    setFormulaElements(elements);
  };

  const buildFormulaFromElements = (elements: FormulaElement[]): string => {
    return elements.map(element => {
      if (element.type === 'field') {
        if (element.multiplier) {
          return `{${element.fieldName}} * ${element.multiplier}`;
        }
        return `{${element.fieldName}}`;
      }
      return element.value;
    }).join(' ');
  };

  const addFieldToFormula = (fieldName: string, multiplier?: number) => {
    const field = availableFields.find(f => f.name === fieldName);
    if (!field) return;

    const newElements: FormulaElement[] = [...formulaElements];
    
    // Add operator if not empty
    if (newElements.length > 0) {
      newElements.push({ type: 'operator', value: '+' });
    }

    // Add field
    newElements.push({
      type: 'field',
      value: field.label,
      fieldName: fieldName,
      multiplier: multiplier
    });

    // If multiplier is provided, add multiplication
    if (multiplier) {
      newElements.push({ type: 'operator', value: '*' });
      newElements.push({ type: 'number', value: multiplier.toString() });
    }

    setFormulaElements(newElements);
    const newFormula = buildFormulaFromElements(newElements);
    onFormulaChange?.(newFormula);
  };

  const removeFormulaElement = (index: number) => {
    const newElements = formulaElements.filter((_, i) => i !== index);
    setFormulaElements(newElements);
    const newFormula = buildFormulaFromElements(newElements);
    onFormulaChange?.(newFormula);
  };

  const cashDenominations = [
    { label: '$100 Bills', value: 100 },
    { label: '$50 Bills', value: 50 },
    { label: '$20 Bills', value: 20 },
    { label: '$10 Bills', value: 10 },
    { label: '$5 Bills', value: 5 },
    { label: '$1 Bills', value: 1 },
    { label: '$1 Coins', value: 1 },
    { label: '$0.25 Coins', value: 0.25 },
    { label: '$0.10 Coins', value: 0.10 },
    { label: '$0.05 Coins', value: 0.05 },
    { label: '$0.01 Coins', value: 0.01 }
  ];

  const getFormulaHelp = () => (
    <div className="space-y-2 text-sm">
      <div>
        <strong>Available operations:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Addition: +</li>
          <li>Subtraction: -</li>
          <li>Multiplication: *</li>
          <li>Division: /</li>
          <li>Parentheses: ( )</li>
        </ul>
      </div>
      <div>
        <strong>Reference other fields:</strong>
        <p className="mt-1">Use {`{field_name}`} to reference values from other form fields.</p>
      </div>
      <div>
        <strong>Example:</strong>
        <code className="block mt-1 p-2 bg-muted rounded">
          {`{quantity} * {price} * 1.1`}
        </code>
        <p className="text-xs text-muted-foreground mt-1">
          Calculates quantity × price with 10% markup
        </p>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Label htmlFor={`formula-${label}`}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Info className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            {getFormulaHelp()}
          </PopoverContent>
        </Popover>
        {isBuilding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBuilder(!showBuilder)}
            className="ml-auto"
          >
            <Calculator className="h-3 w-3 mr-1" />
            {showBuilder ? 'Hide' : 'Show'} Builder
          </Button>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      )}

      {showBuilder && isBuilding && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Formula Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick Cash Counting Templates */}
            <div>
              <Label className="text-xs text-muted-foreground">Quick Templates</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormulaElements([]);
                    cashDenominations.forEach((denom, index) => {
                      const fieldName = denom.label.toLowerCase().replace(/[\$\s\.]/g, '_').replace('__', '_');
                      if (index > 0) {
                        addFieldToFormula(fieldName, denom.value);
                      } else {
                        addFieldToFormula(fieldName, denom.value);
                      }
                    });
                  }}
                >
                  Cash Count Total
                </Button>
              </div>
            </div>

            {/* Add Field Selector */}
            <div>
              <Label className="text-xs text-muted-foreground">Add Field</Label>
              <div className="flex gap-2 mt-1">
                <Select onValueChange={(fieldName) => addFieldToFormula(fieldName)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.filter(f => f.type === 'number').map(field => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cash Denominations */}
            <div>
              <Label className="text-xs text-muted-foreground">Add Cash Denomination</Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {cashDenominations.map((denom) => (
                  <Button
                    key={denom.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fieldName = denom.label.toLowerCase().replace(/[\$\s\.]/g, '_').replace('__', '_');
                      addFieldToFormula(fieldName, denom.value);
                    }}
                    className="text-xs h-8"
                  >
                    {denom.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Formula Preview */}
            {formulaElements.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Formula Preview</Label>
                <div className="flex flex-wrap gap-1 mt-1 p-2 bg-muted/30 rounded">
                  {formulaElements.map((element, index) => (
                    <div key={index} className="flex items-center">
                      <Badge 
                        variant={element.type === 'field' ? 'default' : 'secondary'}
                        className="relative group"
                      >
                        {element.value}
                        {element.multiplier && (
                          <span className="ml-1">×{element.multiplier}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFormulaElement(index)}
                          className="ml-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Input
          id={`formula-${label}`}
          value={calculatedValue !== null ? calculatedValue.toString() : ""}
          placeholder={placeholder}
          readOnly
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      {formula && !showBuilder && (
        <Card className="mt-2 bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">
              <strong>Formula:</strong> <code>{formula}</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// For form builder preview
export function FormulaFieldPreview({
  label = "Total Cash Count",
  description = "Automatically calculated based on cash denominations",
  className = ""
}: Partial<FormulaFieldProps>) {
  const sampleFields = [
    { label: '$20 Bills', name: 'twenty_bills', type: 'number' },
    { label: '$10 Bills', name: 'ten_bills', type: 'number' },
    { label: '$5 Bills', name: 'five_bills', type: 'number' },
    { label: '$1 Bills', name: 'one_bills', type: 'number' }
  ];

  return (
    <FormulaField
      label={label}
      description={description}
      formula="{twenty_bills} * 20 + {ten_bills} * 10 + {five_bills} * 5 + {one_bills} * 1"
      formData={{ twenty_bills: 3, ten_bills: 5, five_bills: 4, one_bills: 12 }}
      availableFields={sampleFields}
      isBuilding={true}
      className={className}
    />
  );
}