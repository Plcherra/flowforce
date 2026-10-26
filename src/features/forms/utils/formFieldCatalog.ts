import type { FormFieldType } from "@/types/forms";

export type FormFieldCatalogItem = {
  value: FormFieldType;
  labelKey: string;
  descriptionKey: string;
  categoryKey: "forms.categoryBasic" | "forms.categoryChoices" | "forms.categoryAdvanced";
};

export const formFieldCatalog: FormFieldCatalogItem[] = [
  { value: "text", labelKey: "forms.text", descriptionKey: "forms.fieldTextHelp", categoryKey: "forms.categoryBasic" },
  { value: "textarea", labelKey: "forms.fieldParagraph", descriptionKey: "forms.fieldParagraphHelp", categoryKey: "forms.categoryBasic" },
  { value: "number", labelKey: "forms.fieldNumber", descriptionKey: "forms.fieldNumberHelp", categoryKey: "forms.categoryBasic" },
  { value: "email", labelKey: "forms.fieldEmail", descriptionKey: "forms.fieldEmailHelp", categoryKey: "forms.categoryBasic" },
  { value: "phone", labelKey: "forms.fieldPhone", descriptionKey: "forms.fieldPhoneHelp", categoryKey: "forms.categoryBasic" },
  { value: "date", labelKey: "forms.fieldDate", descriptionKey: "forms.fieldDateHelp", categoryKey: "forms.categoryBasic" },
  { value: "datetime", labelKey: "forms.fieldDateTime", descriptionKey: "forms.fieldDateTimeHelp", categoryKey: "forms.categoryBasic" },
  { value: "yes_no", labelKey: "forms.fieldYesNo", descriptionKey: "forms.fieldYesNoHelp", categoryKey: "forms.categoryChoices" },
  { value: "select", labelKey: "forms.dropdown", descriptionKey: "forms.fieldDropdownHelp", categoryKey: "forms.categoryChoices" },
  { value: "radio", labelKey: "forms.fieldRadio", descriptionKey: "forms.fieldRadioHelp", categoryKey: "forms.categoryChoices" },
  { value: "checkbox", labelKey: "forms.checkbox", descriptionKey: "forms.fieldCheckboxHelp", categoryKey: "forms.categoryChoices" },
  { value: "number_slider", labelKey: "forms.fieldSlider", descriptionKey: "forms.fieldSliderHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "rating", labelKey: "forms.rating", descriptionKey: "forms.fieldRatingHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "file_upload", labelKey: "forms.fileUpload", descriptionKey: "forms.fieldFileHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "image_upload", labelKey: "forms.imageUpload", descriptionKey: "forms.fieldImageHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "signature", labelKey: "forms.signature", descriptionKey: "forms.fieldSignatureHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "location", labelKey: "forms.location", descriptionKey: "forms.fieldLocationHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "scanner", labelKey: "forms.scanner", descriptionKey: "forms.fieldScannerHelp", categoryKey: "forms.categoryAdvanced" },
  { value: "formula", labelKey: "forms.fieldFormula", descriptionKey: "forms.fieldFormulaHelp", categoryKey: "forms.categoryAdvanced" },
];

const extraEditorTypes: Array<{ value: FormFieldType; labelKey: string }> = [
  { value: "file", labelKey: "forms.fieldFile" },
  { value: "video_upload", labelKey: "forms.fieldVideo" },
  { value: "audio_recording", labelKey: "forms.fieldAudio" },
  { value: "task", labelKey: "forms.task" },
  { value: "image_selection", labelKey: "forms.imageSelection" },
  { value: "description", labelKey: "forms.fieldDescription" },
];

export const editorFieldTypeOptions: Array<{ value: FormFieldType; labelKey: string }> = [
  ...formFieldCatalog.map((item) => ({ value: item.value, labelKey: item.labelKey })),
  ...extraEditorTypes,
];
