import { EventEmitter } from 'events';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfficeService } from './office.service';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import officegen from 'officegen';
import { createWriteStream } from 'fs';

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  fs: {
    readFile: vi.fn(), writeFile: vi.fn(), readdir: vi.fn(), rename: vi.fn(), unlink: vi.fn(), access: vi.fn(), mkdir: vi.fn(), rm: vi.fn(),
  },
  pdfCreate: vi.fn(),
  pdfLoad: vi.fn(),
  rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b })),
  officegen: vi.fn(),
  createWriteStream: vi.fn(),
  lastOffice: undefined as any,
  lastStream: undefined as any,
}));

vi.mock('child_process', () => ({ execFile: mocks.execFile }));
vi.mock('fs/promises', () => ({ default: mocks.fs, ...mocks.fs }));
vi.mock('fs', () => ({ createWriteStream: mocks.createWriteStream }));
vi.mock('officegen', () => ({ default: mocks.officegen }));
vi.mock('sharp', () => ({ default: vi.fn() }));
vi.mock('pdf-lib', () => ({
  PDFDocument: { create: mocks.pdfCreate, load: mocks.pdfLoad },
  StandardFonts: { Helvetica: 'Helvetica' },
  rgb: mocks.rgb,
}));

function makeDoc(pageCount = 2) {
  const pages: any[] = [];
  return {
    addPage: vi.fn((size?: [number, number]) => {
      const page = { drawText: vi.fn(), getSize: vi.fn(() => ({ width: size?.[0] ?? 612, height: size?.[1] ?? 792 })) };
      pages.push(page);
      return page;
    }),
    getPageCount: vi.fn(() => Math.max(pageCount, pages.length)),
    embedFont: vi.fn(async () => ({ widthOfTextAtSize: vi.fn((text: string, size: number) => text.length * size * 0.6) })),
    save: vi.fn(async () => Buffer.from('pdf')),
  };
}

function makeOffice() {
  const emitter = new EventEmitter() as any;
  emitter.createP = vi.fn(() => ({ addText: vi.fn() }));
  emitter.makeNewSheet = vi.fn(() => ({ name: '', setCell: vi.fn() }));
  emitter.makeNewSlide = vi.fn(() => ({ addText: vi.fn() }));
  emitter.generate = vi.fn((out: EventEmitter) => queueMicrotask(() => out.emit('close')));
  return emitter;
}

function execSucceeds() {
  mocks.execFile.mockImplementation((...args: any[]) => args[args.length - 1](null, { stdout: '', stderr: '' }));
}
function execFails(error = new Error('exec failed')) {
  mocks.execFile.mockImplementation((...args: any[]) => args[args.length - 1](error));
}

describe('OfficeService', () => {
  let service: OfficeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OfficeService();
    execSucceeds();
    mocks.fs.readFile.mockResolvedValue(Buffer.from('data'));
    mocks.fs.writeFile.mockResolvedValue(undefined);
    mocks.fs.rename.mockResolvedValue(undefined);
    mocks.fs.unlink.mockResolvedValue(undefined);
    mocks.fs.access.mockResolvedValue(undefined);
    mocks.fs.mkdir.mockResolvedValue(undefined);
    mocks.fs.rm.mockResolvedValue(undefined);
    mocks.fs.readdir.mockResolvedValue([]);
    mocks.pdfLoad.mockResolvedValue(makeDoc(2));
    mocks.pdfCreate.mockResolvedValue(makeDoc(0));
    mocks.createWriteStream.mockImplementation(() => {
      mocks.lastStream = new EventEmitter();
      return mocks.lastStream;
    });
    mocks.officegen.mockImplementation(() => {
      mocks.lastOffice = makeOffice();
      return mocks.lastOffice;
    });
  });

  it('converts office documents to PDF using a per-job dir and error paths', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['report.pdf']);
    await service.convertToPDF('/in/report.docx', '/out/report.pdf');
    expect(mocks.fs.mkdir).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/lo_/), { recursive: true });
    expect(execFile).toHaveBeenCalledWith('libreoffice', ['--headless', expect.stringMatching(/^-env:UserInstallation=file:\/\//), '--convert-to', 'pdf', '--outdir', expect.stringMatching(/^\/out\/lo_/), '/in/report.docx'], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));
    expect(mocks.fs.rename).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/lo_[^/]+\/report\.pdf$/), '/out/report.pdf');
    expect(mocks.fs.rm).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/lo_/), { recursive: true, force: true });

    // No matching file produced in the work dir -> throws.
    mocks.fs.readdir.mockResolvedValueOnce(['nothing.txt']);
    await expect(service.convertToPDF('/in/a.docx', '/out/a.pdf')).rejects.toThrow('Failed to convert office document to PDF');
  });

  it('converts PDF to Word via a per-job dir and handles missing output', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['a.docx']);
    await service.pdfToWord('/in/a.pdf', '/out/a.docx');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/pdf2word_[^/]+\.html$/), expect.stringContaining('Content from PDF page 1'));
    expect(execFile).toHaveBeenCalledWith('libreoffice', ['--headless', expect.stringMatching(/^-env:UserInstallation=file:\/\//), '--convert-to', 'docx:MS Word 2007 XML', '--outdir', expect.stringMatching(/^\/out\/lo_/), expect.stringMatching(/^\/out\/pdf2word_[^/]+\.html$/)], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));
    expect(mocks.fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/pdf2word_[^/]+\.html$/));

    // No docx produced -> throws.
    mocks.fs.readdir.mockResolvedValueOnce([]);
    await expect(service.pdfToWord('/in/a.pdf', '/out/a.docx')).rejects.toThrow('Failed to convert PDF to Word');
  });

  it('converts PDF to Excel via a per-job dir and handles missing output', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['a.xlsx']);
    await service.pdfToExcel('/in/a.pdf', '/out/a.xlsx');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/pdf2excel_[^/]+\.csv$/), expect.stringContaining('Page,Content,Note'));
    expect(execFile).toHaveBeenCalledWith('libreoffice', ['--headless', expect.stringMatching(/^-env:UserInstallation=file:\/\//), '--convert-to', 'xlsx', '--outdir', expect.stringMatching(/^\/out\/lo_/), expect.stringMatching(/^\/out\/pdf2excel_[^/]+\.csv$/)], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));
    expect(mocks.fs.rename).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/lo_[^/]+\/a\.xlsx$/), '/out/a.xlsx');
    expect(mocks.fs.unlink).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/pdf2excel_[^/]+\.csv$/));

    // No xlsx produced -> throws.
    mocks.fs.readdir.mockResolvedValueOnce([]);
    await expect(service.pdfToExcel('/in/a.pdf', '/out/a.xlsx')).rejects.toThrow('Failed to convert PDF to Excel');
  });

  it('converts PDF to PowerPoint through extracted PNGs, no-pages, and missing output', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['page-2.png', 'page-1.png']).mockResolvedValueOnce(['out.pptx']);
    await service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx');
    expect(execFile).toHaveBeenCalledWith('pdftoppm', ['-png', '-r', '150', '/in/a.pdf', expect.stringMatching(/^\/out\/pptx_[^/]+\/page$/)], expect.objectContaining({ timeout: expect.any(Number) }), expect.any(Function));
    expect(mocks.fs.rename).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/lo_[^/]+\/out\.pptx$/), '/out/a.pptx');
    expect(mocks.fs.rm).toHaveBeenCalledWith(expect.stringMatching(/^\/out\/pptx_/), { recursive: true, force: true });

    mocks.fs.readdir.mockResolvedValueOnce([]);
    await expect(service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx')).rejects.toThrow('No pages extracted');

    mocks.fs.readdir.mockResolvedValueOnce(['page.png']).mockResolvedValueOnce([]);
    await expect(service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx')).rejects.toThrow('Failed to convert PDF to PowerPoint');
  });

  it('creates PDFs from HTML and exposes text extraction/wrapping behavior through htmlToPDF', async () => {
    const html = '<style>x</style><script>y</script><h1>Title</h1><p>A&nbsp;&amp;&lt;&gt;&quot;&#39;</p><div>tail<br>next</div>';
    await service.htmlToPDF(html, '/out/html.pdf');
    await service.htmlToPDF('', '/out/empty.pdf');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith('/out/html.pdf', Buffer.from('pdf'));
    expect(mocks.fs.writeFile).toHaveBeenCalledWith('/out/empty.pdf', Buffer.from('pdf'));
    expect((service as any).extractTextFromHtml(html)).toContain('A &<>"\'');
    expect((service as any).wrapText('one two three\n\nlongword here', { widthOfTextAtSize: (t: string) => t.length * 10 }, 12, 35)).toEqual(expect.arrayContaining(['one', '', 'longword']));
  });

  it('creates Word, Excel, and PowerPoint documents with officegen streams', async () => {
    await service.createWordDocument('First\n\nSecond\n\n', '/out/a.docx');
    expect(officegen).toHaveBeenCalledWith('docx');
    expect(mocks.lastOffice.createP).toHaveBeenCalledTimes(2);
    expect(createWriteStream).toHaveBeenCalledWith('/out/a.docx');

    await service.createExcelDocument({ headers: ['A', 'B'], rows: [['1', '2'], ['3', '4']] }, '/out/a.xlsx');
    expect(officegen).toHaveBeenCalledWith('xlsx');
    expect(mocks.lastOffice.makeNewSheet().setCell).toBeDefined();

    await service.createExcelDocument({ headers: [], rows: [] }, '/out/empty.xlsx');
    await service.createPowerPointDocument([{ title: 'T', content: 'C' }], '/out/a.pptx');
    expect(officegen).toHaveBeenCalledWith('pptx');
    expect(mocks.lastOffice.makeNewSlide).toHaveBeenCalledTimes(1);
  });

  it('rejects create document promises on officegen and stream errors', async () => {
    const errOffice = makeOffice();
    errOffice.generate = vi.fn(() => errOffice.emit('error', new Error('office failed')));
    mocks.officegen.mockReturnValueOnce(errOffice);
    await expect(service.createWordDocument('x', '/out/a.docx')).rejects.toThrow('office failed');

    mocks.createWriteStream.mockImplementationOnce(() => {
      const stream = new EventEmitter();
      queueMicrotask(() => stream.emit('error', new Error('stream failed')));
      return stream;
    });
    const neverClosing = makeOffice();
    neverClosing.generate = vi.fn();
    mocks.officegen.mockReturnValueOnce(neverClosing);
    await expect(service.createPowerPointDocument([{ title: 'T', content: 'C' }], '/out/a.pptx')).rejects.toThrow('stream failed');
  });

  it('wraps external command and PDF errors for converters', async () => {
    execFails(new Error('lo missing'));
    await expect(service.convertToPDF('/in/a.docx', '/out/a.pdf')).rejects.toThrow('lo missing');
    await expect(service.pdfToWord('/in/a.pdf', '/out/a.docx')).rejects.toThrow('Failed to convert PDF to Word');
    await expect(service.pdfToExcel('/in/a.pdf', '/out/a.xlsx')).rejects.toThrow('Failed to convert PDF to Excel');
    await expect(service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx')).rejects.toThrow('Failed to convert PDF to PowerPoint');
  });
});
