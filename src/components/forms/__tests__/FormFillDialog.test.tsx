/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FormFillDialog from '../FormFillDialog';

const mockGetFormFields = vi.fn();
const mockSubmitForm = vi.fn();

vi.mock('react-quill', () => ({
  __esModule: true,
  default: vi.fn(() => null),
}));

vi.mock('react-quill/dist/quill.snow.css', () => ({}), { virtual: true });

vi.mock('@/components/forms/fields/DescriptionField', () => ({
  DescriptionField: () => null,
}));

vi.mock('@/hooks/useForms', () => ({
  useForms: () => ({
    getFormFields: mockGetFormFields,
    submitForm: mockSubmitForm,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('FormFillDialog field ordering', () => {
  beforeEach(() => {
    mockGetFormFields.mockReset();
    mockSubmitForm.mockReset();
  });

  it('renders fields in ascending order and pushes unordered fields last', async () => {
    mockGetFormFields.mockResolvedValue({
      data: [
        {
          id: 'field-2',
          form_id: 'form-123',
          field_type: 'text',
          label: 'Second Field',
          field_order: 2,
          placeholder: null,
          description: null,
          is_required: false,
          options: null,
          validation_rules: null,
          min_value: null,
          max_value: null,
          step_value: null,
          formula_expression: null,
          dependent_fields: null,
          rating_config: null,
          scan_config: null,
          media_config: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'field-3',
          form_id: 'form-123',
          field_type: 'text',
          label: 'No Order Field',
          field_order: null,
          placeholder: null,
          description: null,
          is_required: false,
          options: null,
          validation_rules: null,
          min_value: null,
          max_value: null,
          step_value: null,
          formula_expression: null,
          dependent_fields: null,
          rating_config: null,
          scan_config: null,
          media_config: null,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'field-1',
          form_id: 'form-123',
          field_type: 'text',
          label: 'First Field',
          field_order: 1,
          placeholder: null,
          description: null,
          is_required: false,
          options: null,
          validation_rules: null,
          min_value: null,
          max_value: null,
          step_value: null,
          formula_expression: null,
          dependent_fields: null,
          rating_config: null,
          scan_config: null,
          media_config: null,
          created_at: '2024-01-03T00:00:00.000Z',
          updated_at: '2024-01-03T00:00:00.000Z',
        },
      ],
      error: null,
    });

    render(
      <FormFillDialog
        open
        onOpenChange={() => {}}
        formId="form-123"
      />,
    );

    await waitFor(() => {
      expect(mockGetFormFields).toHaveBeenCalledWith('form-123');
    });

    const firstLabel = await screen.findByText('First Field');
    const secondLabel = await screen.findByText('Second Field');
    const noOrderLabel = await screen.findByText('No Order Field');

    expect(firstLabel.compareDocumentPosition(secondLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secondLabel.compareDocumentPosition(noOrderLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
