import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFormSchemaStore } from '@/stores/useFormSchemaStore';

export function FormLivePreview() {
  const schema = useFormSchemaStore((state) => state.schema);
  const [formState, setFormState] = useState<Record<string, unknown>>({});

  const sections = useMemo(() => schema?.sections ?? [], [schema]);

  useEffect(() => {
    setFormState({});
  }, [schema?.id, sections.length]);

  const handleValueChange = (fieldId: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [fieldId]: value }));
  };

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preview will appear here once a schema is loaded.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-muted/40">
      <div className="sticky top-0 z-10 border-b bg-background/90 p-4 backdrop-blur">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live preview</h3>
          <p className="text-xs text-muted-foreground">
            Form is interactive but changes are not saved. Use this preview to validate configuration.
          </p>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">{schema.title}</h2>
            {schema.metadata?.ownerOnly && (
              <p className="text-xs text-muted-foreground">Owner only form</p>
            )}
          </div>
          {sections.map((section) => (
            <div key={section.id} className="space-y-4 rounded-xl border bg-background p-4 shadow-sm">
              <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
              <div className="space-y-4">
                {section.fields.map((field) => {
                  const value = formState[field.id];
                  switch (field.type) {
                    case 'textarea':
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            {field.label}
                            {field.required && <span className="ml-1 text-red-500">*</span>}
                          </Label>
                          <Textarea
                            placeholder={field.placeholder}
                            value={String(value ?? '')}
                            onChange={(event) => handleValueChange(field.id, event.target.value)}
                          />
                        </div>
                      );
                    case 'select':
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            {field.label}
                            {field.required && <span className="ml-1 text-red-500">*</span>}
                          </Label>
                          <Select
                            value={String(value ?? '')}
                            onValueChange={(selected) => handleValueChange(field.id, selected)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder ?? 'Select an option'} />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options ?? []).map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    case 'radio':
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            {field.label}
                            {field.required && <span className="ml-1 text-red-500">*</span>}
                          </Label>
                          <RadioGroup
                            value={String(value ?? '')}
                            onValueChange={(selected) => handleValueChange(field.id, selected)}
                          >
                            {(field.options ?? []).map((option) => (
                              <div key={option} className="flex items-center gap-2">
                                <RadioGroupItem id={`${field.id}-${option}`} value={option} />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      );
                    case 'checkbox':
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">{field.label}</Label>
                          <div className="space-y-2">
                            {(field.options ?? []).map((option) => {
                              const current = Array.isArray(value) ? value : [];
                              const checked = current.includes(option);
                              return (
                                <label key={option} className="flex cursor-pointer items-center gap-2">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(state) => {
                                      const next = state
                                        ? [...current, option]
                                        : current.filter((item: string) => item !== option);
                                      handleValueChange(field.id, next);
                                    }}
                                  />
                                  <span>{option}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    default:
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            {field.label}
                            {field.required && <span className="ml-1 text-red-500">*</span>}
                          </Label>
                          <Input
                            type={field.type === 'number' ? 'number' : 'text'}
                            placeholder={field.placeholder}
                            value={String(value ?? '')}
                            onChange={(event) => handleValueChange(field.id, event.target.value)}
                          />
                        </div>
                      );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default FormLivePreview;
