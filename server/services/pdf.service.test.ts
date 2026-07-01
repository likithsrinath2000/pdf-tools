import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFService } from './pdf.service';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import sharp from 'sharp';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  fs: {
    readFile: vi.fn(), writeFile: vi.fn(), stat: vi.fn(), mkdir: vi.fn(), readdir: vi.fn(), unlink: vi.fn(),
  },
  sharp: vi.fn(),
  pdfCreate: vi.fn(),
  pdfLoad: vi.fn(),
  degrees: vi.fn((angle: number) => ({ angle })),
  rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b })),
}));

vi.mock('child_process', () => ({ execFile: mocks.execFile }));
vi.mock('crypto', () => ({ randomUUID: () => 'fixed' }));
vi.mock('fs/promises', () => ({ default: mocks.fs, ...mocks.fs }));
vi.mock('sharp', () => ({ default: mocks.sharp }));
vi.mock('pdf-lib', () => ({
  PDFDocument: { create: mocks.pdfCreate, load: mocks.pdfLoad },
  degrees: mocks.degrees,
  rgb: mocks.rgb,
  StandardFonts: {
    Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold', TimesRoman: 'TimesRoman', TimesRomanBold: 'TimesRomanBold',
    TimesRomanItalic: 'TimesRomanItalic', Courier: 'Courier', CourierBold: 'CourierBold',
  },
}));

function makePage(width = 600, height = 800) {
  return {
    getSize: vi.fn(() => ({ width, height })),
    getRotation: vi.fn(() => ({ angle: 10 })),
    setRotation: vi.fn(),
    drawImage: vi.fn(), drawText: vi.fn(), drawRectangle: vi.fn(), drawEllipse: vi.fn(), drawLine: vi.fn(),
  };
}

function makeDoc(pageCount = 3) {
  const pages = Array.from({ length: pageCount }, () => makePage());
  return {
    pages,
    addPage: vi.fn((arg?: any) => (Array.isArray(arg) ? makePage(arg[0], arg[1]) : (arg || makePage()))),
    copyPages: vi.fn(async (_src: any, indices: number[]) => indices.map(() => makePage())),
    getPageIndices: vi.fn(() => pages.map((_, i) => i)),
    getPageCount: vi.fn(() => pages.length),
    getPages: vi.fn(() => pages),
    save: vi.fn(async () => Buffer.from('pdf')),
    embedJpg: vi.fn(async () => ({ width: 20, height: 10 })),
    embedPng: vi.fn(async () => ({ width: 30, height: 15 })),
    embedFont: vi.fn(async () => ({ widthOfTextAtSize: vi.fn((text: string, size: number) => text.length * size) })),
  };
}

function execSucceeds(stdout = '') {
  mocks.execFile.mockImplementation((...args: any[]) => args[args.length - 1](null, { stdout, stderr: '' }));
}
function execFails(error: any = new Error('fail')) {
  mocks.execFile.mockImplementation((...args: any[]) => args[args.length - 1](error));
}

describe('PDFService', () => {
  let service: PDFService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PDFService();
    execSucceeds();
    mocks.fs.readFile.mockResolvedValue(Buffer.from('input'));
    mocks.fs.writeFile.mockResolvedValue(undefined);
    mocks.fs.mkdir.mockResolvedValue(undefined);
    mocks.fs.readdir.mockResolvedValue([]);
    mocks.fs.unlink.mockResolvedValue(undefined);
    mocks.fs.stat.mockResolvedValue({ size: 1234 });
    mocks.pdfCreate.mockImplementation(async () => makeDoc());
    mocks.pdfLoad.mockImplementation(async () => makeDoc());
    const chain = { jpeg: vi.fn(() => chain), png: vi.fn(() => chain), toBuffer: vi.fn(async () => Buffer.from('jpg')), toFile: vi.fn(async () => undefined) };
    mocks.sharp.mockReturnValue(chain);
  });

  it('protects PDFs, requires password, and scrubs qpdf errors', async () => {
    await expect(service.protectPDF('in.pdf', 'out.pdf', '')).rejects.toThrow('A password is required');

    await service.protectPDF('in.pdf', 'out.pdf', 'secret');
    expect(execFile).toHaveBeenCalledWith('qpdf', ['--encrypt', 'secret', 'secret', '256', '--', 'in.pdf', 'out.pdf'], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));

    execFails(new Error('qpdf --encrypt secret secret failed'));
    await expect(service.protectPDF('in.pdf', 'out.pdf', 'secret')).rejects.toThrow('Failed to encrypt PDF');
    await expect(service.protectPDF('in.pdf', 'out.pdf', 'secret')).rejects.not.toThrow('secret');
  });

  it('detects encryption through pdf-lib and qpdf fallbacks', async () => {
    await expect(service.isPDFEncrypted('plain.pdf')).resolves.toBe(false);
    mocks.pdfLoad.mockRejectedValueOnce(new Error('document is encrypted'));
    await expect(service.isPDFEncrypted('encrypted.pdf')).resolves.toBe(true);
    mocks.pdfLoad.mockRejectedValueOnce(new Error('parse failed'));
    execSucceeds('R = 6 encrypted with password');
    await expect(service.isPDFEncrypted('qpdf.pdf')).resolves.toBe(true);
    mocks.pdfLoad.mockRejectedValueOnce(new Error('parse failed'));
    execFails({ stderr: 'password required' });
    await expect(service.isPDFEncrypted('qpdf-error.pdf')).resolves.toBe(true);
  });

  it('unlocks PDFs and handles already-unprotected, invalid password, and pdf-lib fallback', async () => {
    await expect(service.unlockPDF('plain.pdf', 'out.pdf', 'pw')).rejects.toThrow('ALREADY_UNPROTECTED');

    mocks.pdfLoad.mockRejectedValueOnce(new Error('encrypted'));
    execFails({ stderr: 'invalid password' });
    await expect(service.unlockPDF('locked.pdf', 'out.pdf', 'bad')).rejects.toThrow('INVALID_PASSWORD');

    const unlocked = makeDoc();
    mocks.pdfLoad.mockRejectedValueOnce(new Error('encrypted')).mockResolvedValueOnce(unlocked as any);
    execFails(new Error('qpdf failed'));
    await service.unlockPDF('locked.pdf', 'out.pdf', 'pw');
    expect(PDFDocument.load).toHaveBeenLastCalledWith(Buffer.from('input'), { password: 'pw' });
    expect(mocks.fs.writeFile).toHaveBeenCalledWith('out.pdf', Buffer.from('pdf'));

    mocks.pdfLoad.mockRejectedValueOnce(new Error('encrypted')).mockRejectedValueOnce(new Error('bad password'));
    await expect(service.unlockPDF('locked.pdf', 'out.pdf', 'pw')).rejects.toThrow('INVALID_PASSWORD');
  });

  it('merges, splits, removes, extracts, and organizes pages', async () => {
    await service.mergePDFs(['a.pdf', 'b.pdf'], 'merged.pdf');
    await service.mergePDFs(['a.pdf'], 'ordered.pdf', [{ fileIndex: 0, pageNumber: 2 }, { fileIndex: 99, pageNumber: 1 }]);
    const splitResult = await service.splitPDF('in.pdf', [{ start: 1, end: 2 }], '/out');
    // Written into a unique per-job subdir to avoid concurrent split_N collisions.
    expect(splitResult).toHaveLength(1);
    expect(splitResult[0]).toMatch(/^\/out\/split_[^/]+\/split_1\.pdf$/);
    expect(mocks.fs.mkdir).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/split_/), { recursive: true });
    await service.removePages('in.pdf', [2], 'removed.pdf');
    await service.extractPages('in.pdf', [1, 3], 'extract.pdf');
    await service.organizePDF('in.pdf', [], { 2: 90 }, 'organized.pdf');
    await service.organizePDF('in.pdf', [3, 1], { 3: 180 }, 'organized2.pdf');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith('merged.pdf', Buffer.from('pdf'));
    expect(degrees).toHaveBeenCalledWith(90);
    expect(degrees).toHaveBeenCalledWith(180);
  });

  it('compresses and converts to PDF/A using gs or pdf-lib fallback', async () => {
    await service.compressPDF('in.pdf', 'out.pdf', 'low');
    expect(execFile).toHaveBeenCalledWith('gs', expect.arrayContaining(['-dPDFSETTINGS=/screen']), expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));

    execFails();
    await service.compressPDF('in.pdf', 'fallback.pdf', 'high');
    await service.convertToPDFA('in.pdf', 'pdfa.pdf');
    expect(mocks.fs.writeFile).toHaveBeenCalledWith('fallback.pdf', Buffer.from('pdf'));
    expect(mocks.fs.writeFile).toHaveBeenCalledWith('pdfa.pdf', Buffer.from('pdf'));

    execSucceeds();
    await service.convertToPDFA('in.pdf', 'pdfa-gs.pdf');
    expect(execFile).toHaveBeenCalledWith('gs', expect.arrayContaining(['-dPDFA=2']), expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));
  });

  it('builds PDFs from jpg, png, and converted images', async () => {
    await service.imagesToPDF(['a.jpg', 'b.png', 'c.gif'], 'images.pdf');

    const createdDoc = await (PDFDocument.create as any).mock.results.at(-1).value;
    expect(createdDoc.embedJpg).toHaveBeenCalledTimes(2);
    expect(createdDoc.embedPng).toHaveBeenCalledTimes(1);
    expect(sharp).toHaveBeenCalledWith(Buffer.from('input'));
    expect(mocks.fs.writeFile).toHaveBeenCalledWith('images.pdf', Buffer.from('pdf'));
  });

  it('converts PDFs to images and reports failures', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['page-2.png', 'page-1.jpg', 'other.txt']);
    const result = await service.pdfToImages('in.pdf', '/imgs', 'png');
    // Rendered into a unique per-job subdir; ordered by page number.
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^\/imgs\/pdf2img_[^/]+\/page-1\.jpg$/);
    expect(result[1]).toMatch(/^\/imgs\/pdf2img_[^/]+\/page-2\.png$/);
    expect(execFile).toHaveBeenCalledWith('pdftoppm', ['-png', 'in.pdf', expect.stringMatching(/^\/imgs\/pdf2img_[^/]+\/page$/)], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));

    execFails(new Error('missing tool'));
    await expect(service.pdfToImages('in.pdf', '/imgs')).rejects.toThrow('Failed to convert PDF to images');
  });

  it('gets PDF info and previews with and without generated images', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['preview_fixed-1.png']);
    mocks.fs.readFile.mockImplementation(async (p: string) => p.endsWith('.png') ? Buffer.from('png') : Buffer.from('input'));
    await expect(service.getPDFInfo('in.pdf')).resolves.toEqual({ pageCount: 3, size: 1234 });
    await expect(service.getPDFPreview('/docs/in.pdf')).resolves.toMatchObject({ pageCount: 3, width: 600, height: 800, previewImage: expect.stringContaining('data:image/png;base64') });

    execFails();
    await expect(service.getPDFPreview('/docs/in.pdf')).resolves.toMatchObject({ previewImage: undefined });
  });

  it('rotates whole documents and selected pages', async () => {
    const doc = makeDoc(2);
    mocks.pdfLoad.mockResolvedValue(doc as any);
    await service.rotatePDF('in.pdf', 'out.pdf', 90);
    await service.rotatePages('in.pdf', 'out2.pdf', { 1: 0, 2: 180 });

    expect(doc.pages[0].setRotation).toHaveBeenCalledWith({ angle: 100 });
    expect(doc.pages[1].setRotation).toHaveBeenCalledWith({ angle: 190 });
  });

  it('adds page numbers across fonts, formats, colors, and positions', async () => {
    await service.addPageNumbers('in.pdf', 'out.pdf', { position: 'top-left', font: 'Times-Roman', isBold: true, color: '#ff0000', format: 'roman', startPage: 2, endPage: 2 });
    await service.addPageNumbers('in.pdf', 'out.pdf', { position: 'middle-right', font: 'Courier', format: 'letter', startNumber: 27 });
    await service.addPageNumbers('in.pdf', 'out.pdf', { position: 'bottom-center', font: 'Helvetica', color: 'bad', format: 'page-of' });

    expect(rgb).toHaveBeenCalledWith(1, 0, 0);
    expect(PDFDocument.load).toHaveBeenCalled();
    expect(StandardFonts.HelveticaBold).toBe('HelveticaBold');
  });

  it('adds watermarks, edits annotations, signs, and repairs PDFs', async () => {
    await service.addWatermark('in.pdf', 'wm.pdf', 'DRAFT', 0.5, -30, 'unknown');
    await service.editPDF('in.pdf', 'edit.pdf', [
      { type: 'text', page: 1, x: 10, y: 10, text: 'Hi', color: '#00ff00' },
      { type: 'rectangle', page: 1, x: 10, y: 20 },
      { type: 'circle', page: 1, x: 10, y: 30 },
      { type: 'line', page: 1, x: 10, y: 40, endX: 50, endY: 60 },
      { type: 'line', page: 1, x: 10, y: 40 },
      { type: 'highlight', page: 1, x: 10, y: 50, color: 'bad' },
      { type: 'freehand', page: 1, x: 0, y: 0, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] },
      { type: 'text', page: 99, x: 0, y: 0 },
    ]);
    await service.signPDF('in.pdf', 'signed.pdf', { signatureType: 'text', signatureText: 'Me', signatureScale: 2, position: { page: 1, x: 10, y: 20 } });
    await service.signPDF('in.pdf', 'signed2.pdf', { signatureType: 'drawn', signatureImage: 'data:image/png;base64,c2ln', position: { page: 1, x: 10, y: 20 } });
    await service.signPDF('in.pdf', 'signed3.pdf', { signatureType: 'text', position: { page: 99, x: 10, y: 20 } });
    await service.repairPDF('in.pdf', 'repaired.pdf');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith('repaired.pdf', Buffer.from('pdf'));
    expect(PDFDocument.load).toHaveBeenLastCalledWith(Buffer.from('input'));
  });

  it('extracts text through layout, fallback, and last-resort write', async () => {
    await service.pdfToText('in.pdf', 'out.txt');
    expect(execFile).toHaveBeenCalledWith('pdftotext', ['-layout', 'in.pdf', 'out.txt'], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));

    mocks.execFile.mockImplementationOnce((...a: any[]) => a[a.length - 1](new Error('layout'))).mockImplementationOnce((...a: any[]) => a[a.length - 1](null, { stdout: '', stderr: '' }));
    await service.pdfToText('in.pdf', 'out.txt');
    expect(execFile).toHaveBeenLastCalledWith('pdftotext', ['in.pdf', 'out.txt'], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));

    execFails();
    await service.pdfToText('in.pdf', 'out.txt');
    expect(mocks.fs.writeFile).toHaveBeenCalledWith('out.txt', expect.stringContaining('Unable to extract text'));
  });

  it('extracts images, converts ppm/pbm, handles none and tool failures', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['image-1.jpg', 'image-2.ppm', 'image-3.pbm', 'skip.txt']);
    const result = await service.extractImages('in.pdf', '/imgs');
    // Extracted into a unique per-job subdir (pdfimg_<uuid>).
    expect(result).toHaveLength(3);
    expect(result[0]).toMatch(/^\/imgs\/pdfimg_[^/]+\/image-1\.jpg$/);
    expect(result[1]).toMatch(/^\/imgs\/pdfimg_[^/]+\/image-2\.png$/);
    expect(result[2]).toMatch(/^\/imgs\/pdfimg_[^/]+\/image-3\.png$/);
    expect(sharp).toHaveBeenCalledWith(expect.stringMatching(/^\/imgs\/pdfimg_[^/]+\/image-2\.ppm$/));
    expect(mocks.fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/^\/imgs\/pdfimg_[^/]+\/image-2\.ppm$/));

    mocks.fs.readdir.mockResolvedValueOnce([]);
    await expect(service.extractImages('in.pdf', '/imgs')).rejects.toThrow('No images found');

    execFails(new Error('pdfimages failed'));
    await expect(service.extractImages('in.pdf', '/imgs')).rejects.toThrow('Failed to extract images: pdfimages failed');
  });
});
