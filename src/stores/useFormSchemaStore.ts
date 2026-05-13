import { create } from "zustand";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import type { FormField, FormFieldType } from "@/types/forms";

export interface FormulaDef {
  id: string;
  name: string;
  expression: string;
  targetFieldId: string;
}

export interface FormSchemaSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface FormSchema {
  id: string;
  title: string;
  sections: FormSchemaSection[];
  formulas: FormulaDef[];
  validations?: Record<string, unknown>;
  metadata?: { ownerOnly?: boolean };
}

interface FormSchemaState {
  schema: FormSchema | null;
  activeSectionId: string | null;
  activeFieldId: string | null;
  loadSchema: (schema: FormSchema) => void;
  setActiveSection: (sectionId: string | null) => void;
  setActiveField: (fieldId: string | null) => void;
  reset: () => void;
  addSection: (title?: string) => void;
  addField: (sectionId: string, field: Partial<FormField>) => void;
  updateField: (
    sectionId: string,
    fieldId: string,
    updates: Partial<FormField>,
  ) => void;
  removeField: (sectionId: string, fieldId: string) => void;
  reorderField: (sectionId: string, fromIndex: number, toIndex: number) => void;
  upsertFormula: (formula: FormulaDef) => void;
  removeFormula: (formulaId: string) => void;
  setMetadata: (metadata: NonNullable<FormSchema["metadata"]>) => void;
}

const randomId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export const useFormSchemaStore = create<FormSchemaState>()(
  persist(
    (set, get) => ({
      schema: null,
      activeSectionId: null,
      activeFieldId: null,
      loadSchema: (schema) => {
        set({
          schema,
          activeSectionId: schema.sections[0]?.id ?? null,
          activeFieldId: schema.sections[0]?.fields[0]?.id ?? null,
        });
      },
      reset: () =>
        set({ schema: null, activeSectionId: null, activeFieldId: null }),
      setActiveSection: (sectionId) => set({ activeSectionId: sectionId }),
      setActiveField: (fieldId) => set({ activeFieldId: fieldId }),
      addSection: (title = "New Section") => {
        const current = get().schema;
        if (!current) return;
        const newSection: FormSchemaSection = {
          id: randomId(),
          title,
          fields: [],
        };
        set({
          schema: {
            ...current,
            sections: [...current.sections, newSection],
          },
          activeSectionId: newSection.id,
          activeFieldId: null,
        });
      },
      addField: (sectionId, field) => {
        const current = get().schema;
        if (!current) return;

        let newFieldId: string | null = null;
        set({
          schema: {
            ...current,
            sections: current.sections.map((section) => {
              if (section.id !== sectionId) {
                return section;
              }
              const newField: FormField = {
                id: randomId(),
                type: (field.type as FormFieldType) ?? "text",
                label: field.label ?? "New field",
                placeholder: field.placeholder,
                required: field.required ?? false,
                options: field.options ?? [],
                validation: field.validation,
                min_value: field.min_value,
                max_value: field.max_value,
                step_value: field.step_value,
                formula_expression: field.formula_expression,
                dependent_fields: field.dependent_fields,
                rating_config: field.rating_config,
                scan_config: field.scan_config,
                media_config: field.media_config,
                content: field.content,
              };
              newFieldId = newField.id;

              return {
                ...section,
                fields: [...section.fields, newField],
              };
            }),
          },
          activeSectionId: sectionId,
          activeFieldId: newFieldId,
        });
      },
      updateField: (sectionId, fieldId, updates) => {
        const current = get().schema;
        if (!current) return;

        set({
          schema: {
            ...current,
            sections: current.sections.map((section) => {
              if (section.id !== sectionId) {
                return section;
              }
              return {
                ...section,
                fields: section.fields.map((field) =>
                  field.id === fieldId ? { ...field, ...updates } : field,
                ),
              };
            }),
          },
        });
      },
      removeField: (sectionId, fieldId) => {
        const current = get().schema;
        if (!current) return;

        let nextActiveField: string | null = get().activeFieldId;
        set({
          schema: {
            ...current,
            sections: current.sections.map((section) => {
              if (section.id !== sectionId) {
                return section;
              }
              const remaining = section.fields.filter(
                (field) => field.id !== fieldId,
              );
              if (get().activeFieldId === fieldId) {
                nextActiveField = remaining[0]?.id ?? null;
              }
              return {
                ...section,
                fields: remaining,
              };
            }),
          },
          activeFieldId: nextActiveField,
        });
      },
      reorderField: (sectionId, fromIndex, toIndex) => {
        const current = get().schema;
        if (!current) return;
        set({
          schema: {
            ...current,
            sections: current.sections.map((section) => {
              if (section.id !== sectionId) {
                return section;
              }
              const updated = [...section.fields];
              const [moved] = updated.splice(fromIndex, 1);
              updated.splice(toIndex, 0, moved);
              return {
                ...section,
                fields: updated,
              };
            }),
          },
        });
      },
      upsertFormula: (formula) => {
        const current = get().schema;
        if (!current) return;
        const existingIndex = current.formulas.findIndex(
          (item) => item.id === formula.id,
        );
        if (existingIndex === -1) {
          set({
            schema: { ...current, formulas: [...current.formulas, formula] },
          });
        } else {
          const formulas = [...current.formulas];
          formulas[existingIndex] = formula;
          set({ schema: { ...current, formulas } });
        }
      },
      removeFormula: (formulaId) => {
        const current = get().schema;
        if (!current) return;
        set({
          schema: {
            ...current,
            formulas: current.formulas.filter((item) => item.id !== formulaId),
          },
        });
      },
      setMetadata: (metadata) => {
        const current = get().schema;
        if (!current) return;
        set({ schema: { ...current, metadata } });
      },
    }),
    {
      name: "form-schema-store",
      partialize: (state) => ({ schema: state.schema }),
    },
  ),
);

export const useFormSchema = () =>
  useFormSchemaStore((state) => state.schema);
