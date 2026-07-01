import React from 'react';
(globalThis as any).React = React;
vi.setConfig({ testTimeout: 20000 });
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value = [0], onValueChange, 'data-testid': testId }: any) => (
    <input data-testid={testId || 'slider'} type="range" value={value[0]} onChange={(e) => onValueChange?.([Number((e.target as HTMLInputElement).value)])} />
  ),
}));
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, 'data-testid': testId, id }: any) => (
    <button id={id} role="switch" aria-checked={!!checked} data-testid={testId} onClick={() => onCheckedChange?.(!checked)}>{checked ? 'on' : 'off'}</button>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <div data-value={value} onClick={(e: any) => { const v = e.target?.getAttribute?.('data-value'); if (v) onValueChange?.(v); }}>{children}</div>,
  SelectTrigger: ({ children, 'data-testid': testId }: any) => <button data-testid={testId}>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => <button data-value={value}>{children}</button>,
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ value, onValueChange, children }: any) => <div data-tab={value} onClick={(e: any) => { const v = e.target?.getAttribute?.('data-tab-value'); if (v) onValueChange?.(v); }}>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: any) => <button data-tab-value={value}>{children}</button>,
  TabsContent: ({ value, children }: any) => <div data-testid={`tab-${value}`}>{children}</div>,
}));
vi.mock('framer-motion', () => ({ Reorder: { Group: ({ children }: any) => <div>{children}</div>, Item: ({ children, ...props }: any) => <div {...props}>{children}</div> } }));
vi.mock('@tinymce/tinymce-react', () => ({ Editor: ({ onInit, onEditorChange, initialValue, value }: any) => { React.useEffect(() => { onInit?.({}, { getContent: ({ format }: any = {}) => format === 'text' ? 'hello world' : (value || initialValue || '<p>x</p>') }); onEditorChange?.('<p>changed content</p>'); }, []); return <textarea data-testid="tinymce" defaultValue={value || initialValue} />; } }));
vi.mock('tinymce/tinymce', () => ({})); vi.mock('tinymce/models/dom', () => ({})); vi.mock('tinymce/themes/silver', () => ({})); vi.mock('tinymce/icons/default', () => ({}));
vi.mock('tinymce/plugins/advlist', () => ({}));
vi.mock('tinymce/plugins/autolink', () => ({}));
vi.mock('tinymce/plugins/lists', () => ({}));
vi.mock('tinymce/plugins/link', () => ({}));
vi.mock('tinymce/plugins/image', () => ({}));
vi.mock('tinymce/plugins/charmap', () => ({}));
vi.mock('tinymce/plugins/preview', () => ({}));
vi.mock('tinymce/plugins/anchor', () => ({}));
vi.mock('tinymce/plugins/searchreplace', () => ({}));
vi.mock('tinymce/plugins/visualblocks', () => ({}));
vi.mock('tinymce/plugins/code', () => ({}));
vi.mock('tinymce/plugins/fullscreen', () => ({}));
vi.mock('tinymce/plugins/insertdatetime', () => ({}));
vi.mock('tinymce/plugins/media', () => ({}));
vi.mock('tinymce/plugins/table', () => ({}));
vi.mock('tinymce/plugins/wordcount', () => ({}));
vi.mock('tinymce/plugins/codesample', () => ({}));
vi.mock('tinymce/plugins/quickbars', () => ({}));
vi.mock('tinymce/plugins/pagebreak', () => ({}));
vi.mock('tinymce/plugins/nonbreaking', () => ({}));
vi.mock('tinymce/plugins/visualchars', () => ({}));
vi.mock('tinymce/plugins/save', () => ({}));
vi.mock('tinymce/plugins/directionality', () => ({}));
vi.mock('tinymce/skins/ui/oxide/skin.css', () => ({}));
vi.mock('react-image-crop', () => ({
  default: ({ children, onChange, onComplete }: any) => <div data-testid="react-crop" onClick={() => { onChange?.({}, { unit: '%', x: 1, y: 2, width: 50, height: 40 }); onComplete?.({ x: 10, y: 20, width: 30, height: 40 }); }}>{children}</div>,
  centerCrop: (crop: any) => crop,
  makeAspectCrop: (crop: any) => crop,
}));
vi.mock('react-image-crop/dist/ReactCrop.css', () => ({}));
vi.mock('@/lib/thumbnailCache', () => ({ getFileHash: vi.fn(async () => 'hash'), generateCacheKey: vi.fn((h,p,s) => `${h}-${p}-${s}`), getCachedThumbnail: vi.fn(async () => null), setCachedThumbnail: vi.fn(async () => undefined) }));
vi.mock('pdfjs-dist', () => {
  const page = { getViewport: vi.fn(() => ({ width: 120, height: 160 })), render: vi.fn(() => ({ promise: Promise.resolve() })) };
  return { GlobalWorkerOptions: {}, getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 3, getPage: vi.fn(async () => page), destroy: vi.fn() }) })) };
});

import { CompressOptions } from './CompressOptions';
import { CropOptions } from './CropOptions';
import { DocumentEditor } from './DocumentEditor';
import { EditPdfEditor } from './EditPdfEditor';
import { ExcelEditor } from './ExcelEditor';
import { ExtractPagesEditor } from './ExtractPagesEditor';
import { ExtractPagesOptions } from './ExtractPagesOptions';
import { HtmlToPdfEditor } from './HtmlToPdfEditor';
import { MergeEditor } from './MergeEditor';
import { OrganizePdfEditor } from './OrganizePdfEditor';
import { PageNumberEditor } from './PageNumberEditor';
import { PasswordOptions } from './PasswordOptions';
import { PowerPointEditor } from './PowerPointEditor';
import { ResizeOptions } from './ResizeOptions';
import { RotateOptions } from './RotateOptions';
import { RotatePagesEditor } from './RotatePagesEditor';
import { SignatureOptions } from './SignatureOptions';
import { SplitEditor } from './SplitEditor';
import { VisualCompressEditor } from './VisualCompressEditor';
import { VisualConvertEditor } from './VisualConvertEditor';
import { VisualCropEditor } from './VisualCropEditor';
import { VisualResizeEditor } from './VisualResizeEditor';
import { VisualRotateEditor } from './VisualRotateEditor';
import { WatermarkOptions } from './WatermarkOptions';
import { WordEditor } from './WordEditor';

const file = (name='doc.pdf', type='application/pdf') => Object.assign(new File([new Uint8Array([1,2,3])], name, { type }), { arrayBuffer: vi.fn(async () => new Uint8Array([1,2,3]).buffer), text: vi.fn(async () => '<p>file</p>') });

beforeEach(() => {
  vi.clearAllMocks();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(), clip: vi.fn(), ellipse: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillRect: vi.fn(), lineCap: '', lineJoin: '', strokeStyle: '', fillStyle: '', lineWidth: 1 }) as any);
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,AAAA');
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, width: 500, height: 500, right: 500, bottom: 500 }) });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, value: 400 });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, value: 300 });
  Object.defineProperty(HTMLImageElement.prototype, 'width', { configurable: true, value: 200 });
  Object.defineProperty(HTMLImageElement.prototype, 'height', { configurable: true, value: 150 });
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ previewImage: 'data:preview', width: 600, height: 800 }) })));
});

describe('simple option editors', () => {
  it('updates compression, crop, extract, resize, rotate, watermark, password options', async () => {
    const user = userEvent.setup();
    const c = vi.fn(); render(<CompressOptions onChange={c} />); await user.click(screen.getByText(/Extreme Compression/i)); fireEvent.change(screen.getByTestId('compression-slider'), { target: { value: '85' } }); await waitFor(() => expect(c).toHaveBeenLastCalledWith('custom-85'));
    const crop = vi.fn(); render(<CropOptions onChange={crop} />); fireEvent.change(screen.getByTestId('input-left'), { target: { value: '12' } }); fireEvent.change(screen.getByTestId('input-top'), { target: { value: 'bad' } }); await waitFor(() => expect(crop).toHaveBeenLastCalledWith(expect.objectContaining({ left: 12, top: 0 })));
    const ex = vi.fn(); render(<ExtractPagesOptions onChange={ex} />); fireEvent.change(screen.getByTestId('input-extract-pages'), { target: { value: '3,1-2,2,x' } }); await waitFor(() => expect(ex).toHaveBeenLastCalledWith([1,2,3]));
    const rz = vi.fn(); render(<ResizeOptions onChange={rz} />); fireEvent.change(screen.getByTestId('input-width'), { target: { value: '' } }); await user.click(screen.getByTestId('switch-aspect-ratio')); await waitFor(() => expect(rz).toHaveBeenLastCalledWith(expect.objectContaining({ width: undefined, maintainAspectRatio: false })));
    const rot = vi.fn(); render(<RotateOptions onChange={rot} />); await user.click(screen.getByText('180°')); await waitFor(() => expect(rot).toHaveBeenLastCalledWith(180));
    const wm = vi.fn(); render(<WatermarkOptions onChange={wm} />); fireEvent.change(screen.getByTestId('input-watermark-text'), { target: { value: '' } }); fireEvent.change(screen.getByTestId('slider-opacity'), { target: { value: '55' } }); fireEvent.change(screen.getByTestId('slider-font-size'), { target: { value: '120' } }); fireEvent.click(screen.getByText(/Vertical/)); await waitFor(() => expect(wm).toHaveBeenCalled());
    const pwd = vi.fn(); render(<PasswordOptions mode="protect" onChange={pwd} />); await user.type(screen.getByTestId('input-password'), 'Aa1!aaaaBBBB'); await user.type(screen.getByTestId('input-confirm-password'), 'mismatch'); expect(screen.getByText(/don't match/i)).toBeInTheDocument(); await user.clear(screen.getByTestId('input-confirm-password')); await user.type(screen.getByTestId('input-confirm-password'), 'Aa1!aaaaBBBB'); await waitFor(() => expect(pwd).toHaveBeenLastCalledWith('Aa1!aaaaBBBB'));
    const unlock = vi.fn(); render(<PasswordOptions mode="unlock" onChange={unlock} />); await user.type(screen.getAllByTestId('input-password').at(-1)!, 'secret'); await waitFor(() => expect(unlock).toHaveBeenLastCalledWith('secret'));
  });
});

describe('document creation editors', () => {
  it('edits excel, ppt, html, word, and document content', async () => {
    const user = userEvent.setup();
    const excel = vi.fn(); render(<ExcelEditor onDataChange={excel} />); await user.click(screen.getByText(/Add Column/i)); await user.click(screen.getByText(/Add Row/i)); fireEvent.change(screen.getByDisplayValue('Column A'), { target: { value: 'Name' } }); fireEvent.change(screen.getAllByPlaceholderText('...')[0], { target: { value: 'Alice' } }); await user.click(screen.getByText(/Remove Column/i)); await user.click(screen.getByText(/Remove Row/i)); expect(excel).toHaveBeenCalled();
    const ppt = vi.fn(); render(<PowerPointEditor onSlidesChange={ppt} />); await user.click(screen.getAllByRole('button')[4]); fireEvent.change(screen.getByPlaceholderText('Slide Title'), { target: { value: '' } }); fireEvent.change(screen.getByPlaceholderText(/Add your slide content/i), { target: { value: 'Body' } }); await user.click(screen.getByText(/Second Slide/i)); expect(ppt).toHaveBeenCalled();
    const html = vi.fn(); const htmlFile = file('x.html', 'text/html'); vi.spyOn(htmlFile, 'text').mockResolvedValue('<h1>Uploaded</h1>'); render(<HtmlToPdfEditor files={[htmlFile]} onOptionsChange={html} />); expect(await screen.findByDisplayValue('<h1>Uploaded</h1>')).toBeInTheDocument(); await user.click(screen.getByText('Preview')); expect(screen.getByTitle('HTML Preview')).toBeInTheDocument(); await user.click(screen.getByText('Code')); fireEvent.change(screen.getByTestId('html-input'), { target: { value: '<p>New</p>' } }); await user.click(screen.getByText('Clear')); await user.click(screen.getByText(/Reset/)); expect(html).toHaveBeenCalled();
    const word = vi.fn(); render(<WordEditor onContentChange={word} />); expect(await screen.findByTestId('tinymce')).toBeInTheDocument(); await waitFor(() => expect(word).toHaveBeenCalledWith('<p>changed content</p>'));
    const doc = vi.fn(); render(<DocumentEditor onOptionsChange={doc} initialContent="<p>Hi</p>" />); await user.click(screen.getByTestId('button-fullscreen')); await user.click(screen.getByTestId('button-fullscreen')); await waitFor(() => expect(doc).toHaveBeenCalledWith(expect.objectContaining({ format: 'pdf' })));
  });
});

describe('pdf page editors', () => {
  it('loads pages and exercises split, extract, rotate, organize and merge flows', async () => {
    const user = userEvent.setup(); const f = file();
    const split = vi.fn(); render(<SplitEditor files={[f]} onOptionsChange={split} />); fireEvent.change(screen.getByTestId('input-custom-ranges'), { target: { value: '1-2,3' } }); await user.click(screen.getByText(/Fixed Ranges/i)); fireEvent.change(screen.getByTestId('input-split-every'), { target: { value: '2' } }); await user.click(screen.getByText(/Extract Pages/i)); expect(await screen.findByTestId('page-1')).toBeInTheDocument(); await user.click(screen.getByTestId('button-select-all')); await user.click(screen.getByTestId('button-deselect-all')); await user.click(screen.getByTestId('page-2')); await waitFor(() => expect(split).toHaveBeenLastCalledWith({ pagesToExtract: [2], mode: 'extract' })); cleanup();
    const extract = vi.fn(); render(<ExtractPagesEditor files={[f]} onOptionsChange={extract} />); expect(await screen.findByAltText('Page 1')).toBeInTheDocument(); await user.click(screen.getAllByText('Select All').at(-1)!); await user.click(screen.getAllByText('Deselect All').at(-1)!); await user.click(screen.getAllByText('Page 3').at(-1)!); await waitFor(() => expect(extract).toHaveBeenLastCalledWith({ pagesToExtract: [3] })); cleanup();
    const rotate = vi.fn(); render(<RotatePagesEditor files={[f]} onOptionsChange={rotate} />); expect(await screen.findByText('Page 1')).toBeInTheDocument(); await user.click(screen.getByText(/Rotate All Left/i)); await user.click(screen.getAllByTitle('Rotate Right')[0]); await waitFor(() => expect(rotate).toHaveBeenCalledWith(expect.objectContaining({ rotations: expect.any(Object) }))); cleanup();
    const org = vi.fn(); render(<OrganizePdfEditor files={[f]} onOptionsChange={org} />); expect(await screen.findByText(/Organize Your Pages/)).toBeInTheDocument(); await user.hover(screen.getByText('Page 1')); await user.click(screen.getAllByTitle('Rotate Right')[0]); await user.click(screen.getAllByTitle('Remove Page')[0]); await waitFor(() => expect(org).toHaveBeenCalledWith(expect.objectContaining({ pageOrder: expect.any(Array), rotations: expect.any(Object) }))); cleanup();
    const mr = vi.fn(), rm = vi.fn(), po = vi.fn(); render(<MergeEditor files={[file('a.pdf'), file('b.pdf')]} onReorder={mr} onRemove={rm} onPageOrderChange={po} />); await screen.findByText(/Reorder individual pages/); if (screen.queryAllByTitle('Remove Page')[0]) await user.click(screen.queryAllByTitle('Remove Page')[0]); fireEvent.click(screen.getByRole('switch')); const name = await screen.findByText('a.pdf'); expect(name).toBeInTheDocument();
  });
});

describe('advanced editors', () => {
  it('configures page numbers and signatures', async () => {
    const user = userEvent.setup();
    const pn = vi.fn(); render(<PageNumberEditor files={[file()]} onOptionsChange={pn} />); await user.click(screen.getByTestId('view-files')); await user.click(screen.getByTestId('position-top-left')); fireEvent.change(screen.getByTestId('margin-x-slider'), { target: { value: '80' } }); await user.click(screen.getByText('i, ii, iii...')); fireEvent.change(screen.getByTestId('start-number'), { target: { value: '4' } }); fireEvent.change(screen.getByTestId('end-page'), { target: { value: '' } }); await user.click(screen.getByTestId('bold-toggle')); await user.click(screen.getByTestId('italic-toggle')); await user.click(screen.getByTestId('underline-toggle')); await waitFor(() => expect(pn).toHaveBeenCalledWith(expect.objectContaining({ position: 'top-left', isBold: true, isItalic: true, isUnderline: true })));
    const sig = vi.fn(); render(<SignatureOptions file={file()} onChange={sig} />); const canvas = screen.getByTestId('canvas-signature'); fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 }); fireEvent.mouseMove(canvas, { clientX: 30, clientY: 20 }); fireEvent.mouseUp(canvas); await waitFor(() => expect(sig).toHaveBeenCalledWith(expect.objectContaining({ signatureType: 'drawn', signatureImage: expect.stringContaining('data:image') }))); await user.click(screen.getByText(/Type Signature/i)); await user.type(screen.getByTestId('input-signature-text'), 'Likith'); fireEvent.click(screen.getByTestId('signature-position-picker'), { clientX: 250, clientY: 250 }); await waitFor(() => expect(sig).toHaveBeenCalledWith(expect.objectContaining({ signatureText: 'Likith', signatureType: 'text', position: expect.objectContaining({ x: 300 }) })));
  });

  it('draws and edits pdf annotations including snip tools', async () => {
    const user = userEvent.setup(); const opts = vi.fn(); render(<EditPdfEditor files={[file()]} onOptionsChange={opts} />); expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument(); const area = screen.getByAltText('Page 1').parentElement!;
    await user.click(screen.getByTestId('tool-text')); fireEvent.click(area, { clientX: 20, clientY: 30 }); await user.type(screen.getByPlaceholderText('Enter text...'), 'Hello'); await user.click(screen.getByText('Add'));
    await user.click(screen.getByTestId('tool-rectangle')); await user.click(screen.getByRole('switch')); fireEvent.mouseDown(area, { clientX: 50, clientY: 60 }); fireEvent.mouseUp(area, { clientX: 150, clientY: 160 });
    for (const t of ['circle','line','arrow','highlight','freehand']) { await user.click(screen.getByTestId(`tool-${t}`)); fireEvent.mouseDown(area, { clientX: 70, clientY: 80 }); fireEvent.mouseMove(area, { clientX: 120, clientY: 130 }); fireEvent.mouseUp(area, { clientX: 150, clientY: 160 }); }
    await user.click(screen.getByTestId('tool-select')); fireEvent.click(area, { clientX: 25, clientY: 35 }); if (screen.queryByTestId('duplicate-btn')) { await user.click(screen.getByTestId('duplicate-btn')); await user.click(screen.getByTitle('Bold')); await user.click(screen.getByTitle('Italic')); await user.click(screen.getByTitle('Underline')); await user.click(screen.getByTitle('Align Center')); await user.click(screen.getByTitle('Add Link')); await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com'); await user.click(screen.getByText('Add Link')); await user.click(screen.getByTestId('delete-annotation')); } await user.click(screen.getByTestId('undo-btn')); if (!screen.getByTestId('redo-btn').hasAttribute('disabled')) await user.click(screen.getByTestId('redo-btn'));
    await user.click(screen.getByTestId('tool-snip')); await user.click(screen.getAllByText('Circle').at(-1)!); fireEvent.mouseDown(area, { clientX: 10, clientY: 10 }); fireEvent.mouseMove(area, { clientX: 80, clientY: 60 }); fireEvent.mouseUp(area, { clientX: 80, clientY: 60 }); await user.click(screen.getByTestId('capture-snip-btn')); await user.click(screen.getByTestId('paste-btn')); await user.click(screen.getByTestId('fullscreen-btn')); await waitFor(() => expect(opts).toHaveBeenCalledWith(expect.objectContaining({ annotations: expect.any(Array), pageCount: 3 })));
  });
});

describe('visual image editors', () => {
  it('handles empty and populated image editors', async () => {
    const user = userEvent.setup(); const img = file('photo.jpg', 'image/jpeg');
    const c = vi.fn(); render(<VisualCompressEditor imageFile={null} onChange={c} />); expect(screen.getByText(/Upload an image to see/i)).toBeInTheDocument(); render(<VisualCompressEditor imageFile={img} onChange={c} />); await user.click(screen.getByText('Extreme')); fireEvent.change(screen.getByTestId('compression-slider'), { target: { value: '20' } }); await user.click(screen.getByTestId('button-toggle-preview')); await waitFor(() => expect(c).toHaveBeenLastCalledWith(20));
    const conv = vi.fn(); render(<VisualConvertEditor imageFile={null} onChange={conv} />); render(<VisualConvertEditor imageFile={file('logo.png','image/png')} onChange={conv} />); await user.click(screen.getByText('JPG')); await user.click(screen.getAllByText('PNG').at(-1)!); await waitFor(() => expect(conv).toHaveBeenCalledWith('png'));
    const crop = vi.fn(); render(<VisualCropEditor imageFile={null} onChange={crop} />); render(<VisualCropEditor imageFile={img} onChange={crop} />); fireEvent.load(await screen.findByAltText('Crop preview')); await user.click(screen.getByTestId('react-crop')); await user.click(screen.getByTestId('switch-lock-aspect')); await user.click(screen.getByTestId('button-aspect-16-9')); await user.click(screen.getByTestId('button-zoom-in')); await user.click(screen.getByTestId('button-zoom-out')); await user.click(screen.getByTestId('button-reset-crop')); await waitFor(() => expect(crop).toHaveBeenCalled());
    const resize = vi.fn(); render(<VisualResizeEditor imageFile={null} onChange={resize} />); render(<VisualResizeEditor imageFile={img} onChange={resize} />); fireEvent.load(await screen.findByAltText('Resize preview')); fireEvent.change(screen.getByTestId('input-resize-width'), { target: { value: '100' } }); await user.click(screen.getByTestId('switch-maintain-aspect')); fireEvent.change(screen.getByTestId('input-resize-height'), { target: { value: '999' } }); await user.click(screen.getByTestId('button-preset-25')); await user.click(screen.getByTestId('button-preset-200')); await user.click(screen.getByTestId('button-preview-zoom-in')); await user.click(screen.getByTestId('button-preview-zoom-out')); await user.click(screen.getByTestId('button-reset-size')); await waitFor(() => expect(resize).toHaveBeenCalledWith(expect.objectContaining({ maintainAspectRatio: false })));
    const rot = vi.fn(); render(<VisualRotateEditor imageFile={null} onChange={rot} />); render(<VisualRotateEditor imageFile={img} onChange={rot} />); await user.click(screen.getByTestId('button-rotate-cw')); await user.click(screen.getByTestId('button-rotate-ccw')); await user.click(screen.getByTestId('button-flip-h')); await user.click(screen.getByTestId('button-flip-v')); fireEvent.change(screen.getByTestId('slider-angle'), { target: { value: '45' } }); await user.click(screen.getByTestId('button-angle-180')); await user.click(screen.getByTestId('button-reset-rotate')); await waitFor(() => expect(rot).toHaveBeenLastCalledWith({ angle: 0, flipH: false, flipV: false }));
  });
});
