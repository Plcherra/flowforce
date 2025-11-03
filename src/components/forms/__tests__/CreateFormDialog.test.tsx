/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateFormDialog from '../CreateFormDialog';

const mockCreateForm = vi.fn();

vi.mock('@/hooks/useForms', () => ({
  useForms: () => ({
    createForm: mockCreateForm,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/services/forms/formImportService', () => ({
  importFormFromFile: vi.fn(),
}));

describe('CreateFormDialog', () => {
  beforeEach(() => {
    mockCreateForm.mockReset();
  });

  it('creates a form and notifies the parent exactly once', async () => {
    mockCreateForm.mockResolvedValue({
      data: { id: 'form-123' },
      error: null,
    });

    const handleFormCreated = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <CreateFormDialog
        open
        onOpenChange={handleOpenChange}
        onFormCreated={handleFormCreated}
      />,
    );

    fireEvent.click(await screen.findByText('Start from scratch'));

    await waitFor(() => {
      expect(mockCreateForm).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(handleFormCreated).toHaveBeenCalledWith('form-123');
    });

    expect(handleFormCreated).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenLastCalledWith(false);
  });
});
