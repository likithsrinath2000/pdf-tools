import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToolPage from './Tool';
(globalThis as any).React = React;

const h = vi.hoisted(() => ({
  routeId: 'merge-pdf',
  state: {} as any,
  setStage: vi.fn(),
  setFiles: vi.fn(),
  setProcessingOptions: vi.fn(),
  setPdfNotEncrypted: vi.fn(),
  handleFilesSelected: vi.fn(),
  removeFile: vi.fn(),
  handleReorder: vi.fn(),
  handleProcess: vi.fn(),
  handleDownload: vi.fn(),
  handleReset: vi.fn(),
  handleDeleteFile: vi.fn(),
}));

const testFile = new File(['pdf'], 'sample.pdf', { type: 'application/pdf' });

function resetState(overrides: any = {}) {
  h.setStage.mockReset();
  h.setFiles.mockReset();
  h.setProcessingOptions.mockReset();
  h.setPdfNotEncrypted.mockReset();
  h.handleFilesSelected.mockReset();
  h.removeFile.mockReset();
  h.handleReorder.mockReset();
  h.handleProcess.mockReset();
  h.handleDownload.mockReset();
  h.handleReset.mockReset();
  h.handleDeleteFile.mockReset();
  h.state = {
    stage: 'upload',
    setStage: h.setStage,
    files: [testFile],
    setFiles: h.setFiles,
    progress: 42,
    error: 'Boom',
    processingOptions: {},
    setProcessingOptions: h.setProcessingOptions,
    pdfNotEncrypted: false,
    setPdfNotEncrypted: h.setPdfNotEncrypted,
    checkingEncryption: false,
    processedClientSide: false,
    processingPrediction: { mode: 'client', reason: 'small file', deviceScore: 99 },
    handleFilesSelected: h.handleFilesSelected,
    removeFile: h.removeFile,
    handleReorder: h.handleReorder,
    handleProcess: h.handleProcess,
    handleDownload: h.handleDownload,
    handleReset: h.handleReset,
    handleDeleteFile: h.handleDeleteFile,
    ...overrides,
  };
}

vi.mock('wouter', () => ({
  useRoute: () => [true, { id: h.routeId }],
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/Navbar', () => ({ Navbar: () => <div data-testid="navbar" /> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock('@/components/FileUploader', () => ({
  FileUploader: ({ onFilesSelected, accept, maxFiles }: any) => (
    <button data-testid="file-uploader" data-accept={accept} data-max={maxFiles ?? ''} onClick={() => onFilesSelected([testFile, testFile])}>
      upload
    </button>
  ),
}));
vi.mock('@/components/tool-page', () => ({
  useToolProcessing: vi.fn(() => h.state),
  ToolHeader: ({ title, description }: any) => <header><h1>{title}</h1><p>{description}</p></header>,
  ToolProgress: ({ stage, progress, error, isClientSide }: any) => <div data-testid={`progress-${stage}`}>{progress}:{error}:{String(isClientSide)}</div>,
  FilesSelectedActions: ({ showAddMore, onAddMore, onProcess, actionText, processingPrediction }: any) => (
    <div data-testid="files-actions">
      <span>{processingPrediction?.reason}</span>
      {showAddMore && <button onClick={onAddMore}>Add more files</button>}
      <button onClick={onProcess}>{actionText}</button>
    </div>
  ),
  DownloadActions: ({ onDownload, onBackToEdit, onStartOver, onDelete }: any) => (
    <div>
      <button data-testid="button-download" onClick={onDownload}>Download File</button>
      <button data-testid="button-back-to-edit" onClick={onBackToEdit}>Back to Edit Options</button>
      <button data-testid="button-start-over" onClick={onStartOver}>New File</button>
      <button data-testid="button-delete" onClick={onDelete}>Delete File</button>
    </div>
  ),
  ErrorActions: ({ onTryAgain }: any) => <button data-testid="button-try-again" onClick={onTryAgain}>Try Again</button>,
  CreateToolActions: ({ onProcess, disabled, actionText }: any) => <button disabled={disabled} onClick={onProcess}>{actionText}</button>,
  FileList: ({ files, onRemove }: any) => <div data-testid="file-list">{files.map((f: File, i: number) => <button key={i} onClick={() => onRemove(i)}>{f.name}</button>)}</div>,
}));

vi.mock('@/components/tools/MergeEditor', () => ({ MergeEditor: ({ onReorder, onRemove, onPageOrderChange }: any) => <div data-testid="editor-merge"><button onClick={() => onReorder(0, 1)}>reorder</button><button onClick={() => onRemove(0)}>remove</button><button onClick={() => onPageOrderChange([1])}>page order</button></div> }));
vi.mock('@/components/tools/SplitEditor', () => ({ SplitEditor: ({ onOptionsChange }: any) => <button data-testid="editor-split" onClick={() => onOptionsChange({ split: true })}>split editor</button> }));
vi.mock('@/components/tools/CompressOptions', () => ({ CompressOptions: ({ onChange }: any) => <button data-testid="editor-compress" onClick={() => onChange('low')}>compress editor</button> }));
vi.mock('@/components/tools/PageNumberEditor', () => ({ PageNumberEditor: ({ onOptionsChange }: any) => <button data-testid="editor-page-numbers" onClick={() => onOptionsChange({ position: 'top' })}>page numbers</button> }));
vi.mock('@/components/tools/PasswordOptions', () => ({ PasswordOptions: ({ mode, onChange }: any) => <button data-testid={`editor-password-${mode}`} onClick={() => onChange('secret')}>password {mode}</button> }));
vi.mock('@/components/tools/WatermarkOptions', () => ({ WatermarkOptions: ({ onChange }: any) => <button data-testid="editor-watermark" onClick={() => onChange({ text: 'wm' })}>watermark</button> }));
vi.mock('@/components/tools/SignatureOptions', () => ({ SignatureOptions: ({ onChange, file }: any) => <button data-testid="editor-signature" data-file={file?.name} onClick={() => onChange({ signature: true })}>signature</button> }));
vi.mock('@/components/tools/VisualCropEditor', () => ({ VisualCropEditor: ({ onChange, imageFile }: any) => <button data-testid="editor-crop" data-file={imageFile?.name} onClick={() => onChange({ crop: true })}>crop</button> }));
vi.mock('@/components/tools/VisualResizeEditor', () => ({ VisualResizeEditor: ({ onChange, imageFile }: any) => <button data-testid="editor-resize" data-file={imageFile?.name} onClick={() => onChange({ width: 100 })}>resize</button> }));
vi.mock('@/components/tools/VisualRotateEditor', () => ({ VisualRotateEditor: ({ onChange, imageFile }: any) => <button data-testid="editor-rotate-image" data-file={imageFile?.name} onClick={() => onChange({ angle: 90 })}>rotate image</button> }));
vi.mock('@/components/tools/VisualCompressEditor', () => ({ VisualCompressEditor: ({ onChange, imageFile }: any) => <button data-testid="editor-compress-image" data-file={imageFile?.name} onClick={() => onChange(70)}>compress image</button> }));
vi.mock('@/components/tools/VisualConvertEditor', () => ({ VisualConvertEditor: ({ onChange, imageFile }: any) => <button data-testid="editor-convert-image" data-file={imageFile?.name} onClick={() => onChange('jpg')}>convert image</button> }));
vi.mock('@/components/tools/OrganizePdfEditor', () => ({ OrganizePdfEditor: ({ onOptionsChange }: any) => <button data-testid="editor-organize" onClick={() => onOptionsChange({ pages: [1] })}>organize</button> }));
vi.mock('@/components/tools/ExtractPagesEditor', () => ({ ExtractPagesEditor: ({ onOptionsChange }: any) => <button data-testid="editor-extract" onClick={() => onOptionsChange({ range: '1' })}>extract</button> }));
vi.mock('@/components/tools/RotatePagesEditor', () => ({ RotatePagesEditor: ({ onOptionsChange }: any) => <button data-testid="editor-rotate-pdf" onClick={() => onOptionsChange({ angle: 180 })}>rotate pdf</button> }));
vi.mock('@/components/tools/HtmlToPdfEditor', () => ({ HtmlToPdfEditor: ({ onOptionsChange }: any) => <button data-testid="editor-html" onClick={() => onOptionsChange({ html: true })}>html</button> }));
vi.mock('@/components/tools/EditPdfEditor', () => ({ EditPdfEditor: ({ onOptionsChange }: any) => <button data-testid="editor-edit" onClick={() => onOptionsChange({ edits: [] })}>edit</button> }));
vi.mock('@/components/tools/DocumentEditor', () => ({ DocumentEditor: ({ onOptionsChange }: any) => <button data-testid="editor-document" onClick={() => onOptionsChange({ content: 'doc' })}>document</button> }));
vi.mock('@/components/tools/WordEditor', () => ({ WordEditor: ({ onContentChange }: any) => <button data-testid="editor-word" onClick={() => onContentChange('word')}>word</button> }));
vi.mock('@/components/tools/ExcelEditor', () => ({ ExcelEditor: ({ onDataChange }: any) => <button data-testid="editor-excel" onClick={() => onDataChange([['a']])}>excel</button> }));
vi.mock('@/components/tools/PowerPointEditor', () => ({ PowerPointEditor: ({ onSlidesChange }: any) => <button data-testid="editor-powerpoint" onClick={() => onSlidesChange([{ title: 'slide' }])}>powerpoint</button> }));

describe('ToolPage', () => {
  beforeEach(() => {
    h.routeId = 'merge-pdf';
    resetState();
  });

  it('renders the upload stage, handles file selection, and shows single-file copy', async () => {
    const user = userEvent.setup();
    h.routeId = 'merge-pdf';
    resetState({ stage: 'upload' });
    render(<ToolPage />);
    await user.click(screen.getByTestId('file-uploader'));
    expect(h.handleFilesSelected).toHaveBeenCalledWith([testFile, testFile], 'merge-pdf', undefined);
    expect(screen.queryByText(/one file at a time/i)).not.toBeInTheDocument();

    h.routeId = 'compress-pdf';
    resetState({ stage: 'upload' });
    render(<ToolPage />);
    expect(screen.getByText(/one file at a time/i)).toBeInTheDocument();
  });

  it('renders every files-selected editor branch and wires option callbacks', async () => {
    const user = userEvent.setup();
    const cases: Array<[string, string, string | null]> = [
      ['merge-pdf', 'editor-merge', 'page order'],
      ['remove-pages', 'editor-merge', null],
      ['organize-pdf', 'editor-organize', 'organize'],
      ['split-pdf', 'editor-split', 'split editor'],
      ['compress-pdf', 'editor-compress', 'compress editor'],
      ['compress-image', 'editor-compress-image', 'compress image'],
      ['add-page-numbers', 'editor-page-numbers', 'page numbers'],
      ['protect-pdf', 'editor-password-protect', 'password protect'],
      ['unlock-pdf', 'editor-password-unlock', 'password unlock'],
      ['add-watermark', 'editor-watermark', 'watermark'],
      ['rotate-pdf', 'editor-rotate-pdf', 'rotate pdf'],
      ['rotate-image', 'editor-rotate-image', 'rotate image'],
      ['edit-pdf', 'editor-edit', 'edit'],
      ['sign-pdf', 'editor-signature', 'signature'],
      ['resize-image', 'editor-resize', 'resize'],
      ['crop-image', 'editor-crop', 'crop'],
      ['extract-pages', 'editor-extract', 'extract'],
      ['html-to-pdf', 'editor-html', 'html'],
      ['create-document', 'editor-document', 'document'],
      ['convert-image', 'editor-convert-image', 'convert image'],
    ];

    for (const [id, testId, buttonName] of cases) {
      h.routeId = id;
      resetState({ stage: 'files-selected', processingOptions: { existing: true } });
      const view = render(<ToolPage />);
      expect(await screen.findByTestId(testId)).toBeInTheDocument();
      if (buttonName) {
        fireEvent.click(screen.getByRole('button', { name: buttonName }));
      }
      fireEvent.click(screen.getByTestId('files-actions').querySelector('button:last-child')!);
      view.unmount();
    }

    expect(h.setProcessingOptions).toHaveBeenCalled();
    expect(h.handleProcess).toHaveBeenCalledWith('convert-image');
  }, 15000);

  it('handles merge editor reorder/remove callbacks and default file list branch', async () => {
    const user = userEvent.setup();
    h.routeId = 'merge-pdf';
    resetState({ stage: 'files-selected' });
    const view = render(<ToolPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'reorder' }));
    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    expect(h.handleReorder).toHaveBeenCalledWith(0, 1);
    expect(h.removeFile).toHaveBeenCalledWith(0);
    view.unmount();

    h.routeId = 'scan-pdf';
    resetState({ stage: 'files-selected' });
    render(<ToolPage />);
    expect(screen.getByTestId('file-list')).toBeInTheDocument();
  });

  it('renders unlock-pdf checking and already-unprotected branches', async () => {
    const user = userEvent.setup();
    h.routeId = 'unlock-pdf';
    resetState({ stage: 'files-selected', checkingEncryption: true });
    const checking = render(<ToolPage />);
    expect(screen.getByText(/checking if pdf is password protected/i)).toBeInTheDocument();
    checking.unmount();

    resetState({ stage: 'files-selected', pdfNotEncrypted: true });
    render(<ToolPage />);
    await user.click(screen.getByRole('button', { name: /upload a different pdf/i }));
    expect(h.setFiles).toHaveBeenCalledWith([]);
    expect(h.setPdfNotEncrypted).toHaveBeenCalledWith(false);
    expect(h.setStage).toHaveBeenCalledWith('upload');
  });

  it('renders create-tool upload branches with enabled and disabled actions', async () => {
    const user = userEvent.setup();
    for (const [id, editor, action, options, disabled] of [
      ['create-document', 'editor-document', 'Create PDF', {}, true],
      ['create-document', 'editor-document', 'Create PDF', { content: 'x' }, false],
      ['create-word', 'editor-word', 'Create DOCX', { wordContent: 'x' }, false],
      ['create-excel', 'editor-excel', 'Create XLSX', {}, false],
      ['create-powerpoint', 'editor-powerpoint', 'Create PPTX', {}, true],
      ['create-powerpoint', 'editor-powerpoint', 'Create PPTX', { slides: [{}] }, false],
    ] as any[]) {
      h.routeId = id;
      resetState({ stage: 'upload', processingOptions: options });
      const view = render(<ToolPage />);
      expect(await screen.findByTestId(editor)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: action })).toHaveProperty('disabled', disabled);
      await user.click(screen.getByTestId(editor));
      if (!disabled) await user.click(screen.getByRole('button', { name: action }));
      view.unmount();
    }
    expect(h.setProcessingOptions).toHaveBeenCalled();
  });

  it('renders processing, download, error, and not-found states with action wiring', async () => {
    const user = userEvent.setup();

    h.routeId = 'compress-pdf';
    resetState({ stage: 'processing', progress: 77, processedClientSide: true });
    const processing = render(<ToolPage />);
    expect(screen.getByTestId('progress-processing')).toHaveTextContent('77::true');
    processing.unmount();

    resetState({ stage: 'download' });
    const download = render(<ToolPage />);
    await user.click(screen.getByTestId('button-download'));
    await user.click(screen.getByTestId('button-back-to-edit'));
    await user.click(screen.getByTestId('button-start-over'));
    await user.click(screen.getByTestId('button-delete'));
    expect(h.handleDownload).toHaveBeenCalledWith('compress-pdf');
    expect(h.setStage).toHaveBeenCalledWith('files-selected');
    expect(h.handleReset).toHaveBeenCalled();
    expect(h.handleDeleteFile).toHaveBeenCalled();
    download.unmount();

    h.routeId = 'create-word';
    resetState({ stage: 'download' });
    const createDownload = render(<ToolPage />);
    await user.click(screen.getByTestId('button-back-to-edit'));
    expect(h.setStage).toHaveBeenCalledWith('upload');
    createDownload.unmount();

    h.routeId = 'merge-pdf';
    resetState({ stage: 'error', error: 'Failed hard' });
    const error = render(<ToolPage />);
    expect(screen.getByTestId('progress-error')).toHaveTextContent('Failed hard');
    await user.click(screen.getByTestId('button-try-again'));
    expect(h.handleReset).toHaveBeenCalled();
    error.unmount();

    h.routeId = 'definitely-missing';
    resetState();
    render(<ToolPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
    // NotFound renders synchronously; assert directly (avoids load-induced waitFor flake).
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
