export function canKeepForm(fieldCount: number) {
  return fieldCount > 0;
}

export function canPublishForm(fieldCount: number) {
  return canKeepForm(fieldCount);
}

export function canSubmitForm(fieldCount: number) {
  return canKeepForm(fieldCount);
}

export function shouldDiscardEmptyDraft(input: {
  discardIfEmpty: boolean;
  savedFieldCount: number;
}) {
  return input.discardIfEmpty && input.savedFieldCount === 0;
}

export function attachableShiftForms<T extends { status: string | null }>(forms: T[]) {
  return forms.filter((form) => form.status === "published");
}
