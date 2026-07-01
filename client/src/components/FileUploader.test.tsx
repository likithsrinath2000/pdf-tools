import React from 'react';
(globalThis as any).React = React;
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileUploader } from './FileUploader';

describe('FileUploader', () => {
  it('selects pdf files and honors maxFiles', async () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<FileUploader accept=".pdf,.doc,.docx,.xls,.xlsx" maxFiles={1} onFilesSelected={onFilesSelected} />);
    expect(screen.getByRole('heading', { name: /select pdf files/i })).toBeInTheDocument();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['a'], 'a.pdf', { type: 'application/pdf' }));
    await waitFor(() => expect(onFilesSelected).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.pdf' })]));
  });

  it('supports image uploads and drag/drop state', async () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<FileUploader accept=".jpg,.jpeg,.png" className="extra-class" onFilesSelected={onFilesSelected} />);
    const dropzone = container.firstElementChild as HTMLElement;
    expect(screen.getByRole('heading', { name: /select images/i })).toBeInTheDocument();
    expect(dropzone.className).toContain('extra-class');
    const file = new File(['img'], 'photo.png', { type: 'image/png' });
    fireEvent.dragEnter(dropzone, { dataTransfer: { files: [file], items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }], types: ['Files'] } });
    expect(await screen.findByRole('heading', { name: /drop files here/i })).toBeInTheDocument();
    fireEvent.drop(dropzone, { dataTransfer: { files: [file], items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }], types: ['Files'] } });
    await waitFor(() => expect(onFilesSelected).toHaveBeenCalledWith([expect.objectContaining({ name: 'photo.png' })]));
  });
});
