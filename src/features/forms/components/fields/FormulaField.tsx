import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Info,  X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  formulaDisplay,
  shouldEmitFormulaValue,
} from "@/features/forms/utils/formulaValue";

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
  type: "field" | "operator" | "number";
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
  placeholder,
  onChange,
  onFormulaChange,
  isBuilding = false,
  className = "",
}: FormulaFieldProps) {
  const { t } = useTranslation();
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [formulaElements, setFormulaElements] = useState<FormulaElement[]>([]);
  const [showBuilder, setShowBuilder] = useState(isBuilding);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const emittedRef = useRef<number | null | undefined>(undefined);
  const formDataKey = JSON.stringify(formData ?? {});

  // Parse formula into elements for visual builder
  useEffect(() => {
    if (formula && isBuilding) {
      parseFormulaToElements(formula);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [formula, isBuilding]);

  useEffect(() => {
    if (!formula.trim()) {
      setCalculatedValue(null);
      setError("");
      return;
    }
    const display = formulaDisplay(formula, formData ?? {});
    setCalculatedValue(display.value);
    setError(display.invalid ? t("forms.invalidFormula") : "");
    if (!shouldEmitFormulaValue(emittedRef.current, display.value)) return;
    emittedRef.current = display.value;
    onChangeRef.current?.(display.value);
  }, [formula, formData, formDataKey, t]);

  const parseFormulaToElements = (formulaStr: string) => {
    const elements: FormulaElement[] = [];
    const tokens = formulaStr
      .split(/(\+|-|\*|\/|\(|\))/)
      .filter((token) => token.trim());

    tokens.forEach((token) => {
      const trimmed = token.trim();
      if (trimmed.match(/^\{.*\}$/)) {
        // Field reference
        const fieldName = trimmed.slice(1, -1);
        const field = availableFields.find((f) => f.name === fieldName);
        elements.push({
          type: "field",
          value: field?.label || fieldName,
          fieldName: fieldName,
        });
      } else if (trimmed.match(/^[+\-*]$/)) {
        elements.push({ type: "operator", value: trimmed });
      } else if (trimmed.match(/^\d+(\.\d+)?$/)) {
        elements.push({ type: "number", value: trimmed });
      }
    });

    setFormulaElements(elements);
  };

  const buildFormulaFromElements = (elements: FormulaElement[]): string => {
    return elements
      .map((element) => {
        if (element.type === "field") {
          if (element.multiplier) {
            return `{${element.fieldName}} * ${element.multiplier}`;
          }
          return `{${element.fieldName}}`;
        }
        return element.value;
      })
      .join(" ");
  };

  const addFieldToFormula = (fieldName: string, multiplier?: number) => {
    const field = availableFields.find((f) => f.name === fieldName);
    if (!field) return;

    const newElements: FormulaElement[] = [...formulaElements];

    // Add operator if not empty
    if (newElements.length > 0) {
      newElements.push({ type: "operator", value: "+" });
    }

    // Add field
    newElements.push({
      type: "field",
      value: field.label,
      fieldName: fieldName,
      multiplier: multiplier,
    });

    // If multiplier is provided, add multiplication
    if (multiplier) {
      newElements.push({ type: "operator", value: "*" });
      newElements.push({ type: "number", value: multiplier.toString() });
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

  const getFormulaHelp = () => (
    <div className="space-y-2 text-sm">
      <div>
        <strong>{t("forms.availableOperations")}</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>{t("forms.addition")}</li>
          <li>{t("forms.subtraction")}</li>
          <li>{t("forms.multiplication")}</li>
          <li>{t("forms.division")}</li>
          <li>{t("forms.parentheses")}</li>
        </ul>
      </div>
      <div>
        <strong>{t("forms.referenceOtherFields")}</strong>
        <p className="mt-1">
          {t("forms.fieldNameReference", { example: "{field_name}" })}
        </p>
      </div>
      <div>
        <strong>{t("forms.example")}</strong>
        <code className="block mt-1 p-2 bg-muted rounded">
          {`{quantity} * {price} * 1.1`}
        </code>
        <p className="text-xs text-muted-foreground mt-1">
          {t("forms.calculatesQuantityPriceWith10Markup")}</p>
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
          <PopoverContent className="w-80">{getFormulaHelp()}</PopoverContent>
        </Popover>
        {isBuilding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBuilder(!showBuilder)}
            className="ml-auto"
          >
            <Calculator className="h-3 w-3 mr-1" />
            {showBuilder ? t("forms.hideBuilder") : t("forms.showBuilder")}
          </Button>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      )}

      {showBuilder && isBuilding && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("forms.formulaBuilder")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add Field Selector */}
            <div>
              <Label className="text-xs text-muted-foreground">{t("forms.addField")}</Label>
              <div className="flex gap-2 mt-1">
                <Select
                  onValueChange={(fieldName) => addFieldToFormula(fieldName)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("forms.selectAField")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields
                      .filter((f) => f.type === "number")
                      .map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Formula Preview */}
            {formulaElements.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t("forms.formulaPreview")}</Label>
                <div className="flex flex-wrap gap-1 mt-1 p-2 bg-muted/30 rounded">
                  {formulaElements.map((element, index) => (
                    <div key={index} className="flex items-center">
                      <Badge
                        variant={
                          element.type === "field" ? "default" : "secondary"
                        }
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
          placeholder={placeholder ?? t("forms.calculatedAutomatically")}
          readOnly
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {formula && !showBuilder && (
        <Card className="mt-2 bg-muted/30">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-muted-foreground">
              <strong>{t("forms.formula")}</strong> <code>{formula}</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// For form builder preview
export function FormulaFieldPreview({
  label: labelProp,
  description,
  className = "",
}: Partial<FormulaFieldProps>) {
  const { t } = useTranslation();
  const label = labelProp ?? t("forms.fieldFormula");

  return (
    <FormulaField
      label={label}
      description={description}
      formula=""
      formData={{}}
      availableFields={[]}
      className={className}
    />
  );
}
