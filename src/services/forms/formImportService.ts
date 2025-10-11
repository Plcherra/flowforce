import { uploadReportFile } from '@/services/ingestion/api';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';

export interface FormImportResult {
  form: Tables<'forms'>;
  documentId?: string;
  storagePath?: string;
}

interface CreateFieldInput {
  form_id: string;
  label: string;
  field_type: Tables<'form_fields'>['field_type'];
  field_order: number;
  description?: string | null;
  placeholder?: string | null;
}

async function createDefaultFields(formId: string, documentTitle: string) {
  const fields: CreateFieldInput[] = [
    {
      form_id: formId,
      label: `${documentTitle} summary`,
      field_type: 'textarea',
      field_order: 1,
      description: `Insights automatically linked from ${documentTitle}.`,
      placeholder: 'Record observations or additional comments…',
    },
    {
      form_id: formId,
      label: 'Follow-up owner',
      field_type: 'text',
      field_order: 2,
      description: 'Who is accountable for closing the loop?',
    },
  ];

  await supabase.from('form_fields').insert(fields);
}

export async function importFormFromFile(file: File, userId: string) {
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  let documentId: string | undefined;
  let storagePath: string | undefined;
  let extractedSnippet: string | undefined;

  try {
    const { document, storagePath: storedPath } = await uploadReportFile(file, {
      userId,
      source: 'form-import',
      metadata: { origin: 'form_import' },
    });
    documentId = document.id;
    storagePath = storedPath;

    try {
      const text = await file.text();
      extractedSnippet = text.slice(0, 2000);
    } catch (error) {
      console.warn('Unable to extract raw text from uploaded file', error);
    }
  } catch (error) {
    console.warn('Document ingestion failed – continuing without document linkage', error);
  }

  const { data: form, error } = await supabase
    .from('forms')
    .insert({
      title: baseName,
      description: extractedSnippet ? `Imported from ${file.name}` : undefined,
      created_by: userId,
      settings: documentId
        ? {
            sourceDocumentId: documentId,
            sourceStoragePath: storagePath,
          }
        : undefined,
    })
    .select()
    .single();

  if (error || !form) {
    throw error ?? new Error('Unable to create form');
  }

  await createDefaultFields(form.id, baseName);

  if (documentId && extractedSnippet) {
    await supabase
      .from('documents')
      .update({
        meta: {
          source: 'form-import',
          form_id: form.id,
          file_name: file.name,
        },
        text_extracted: extractedSnippet,
        processing_state: 'ready',
      })
      .eq('id', documentId);
  }

  return {
    form,
    documentId,
    storagePath,
  } satisfies FormImportResult;
}
