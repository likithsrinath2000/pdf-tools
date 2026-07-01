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
  mocks.execFile.mockImplementation((_cmd: string, _args: string[], cb: any) => cb(null, { stdout: '', stderr: '' }));
}
function execFails(error = new Error('exec failed')) {
  mocks.execFile.mockImplementation((_cmd: string, _args: string[], cb: any) => cb(error));
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

  it('converts office documents to PDF using matching, fallback, and error paths', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['report.d.pdf']);
    await service.convertToPDF('/in/report.docx', '/out/report.pdf');
    expect(execFile).toHaveBeenCalledWith('libreoffice', ['--headless', '--convert-to', 'pdf', '--outdir', '/out', '/in/report.docx'], expect.any(Function));
    expect(mocks.fs.rename).toHaveBeenCalledWith('/out/report.d.pdf', '/out/report.pdf');

    mocks.fs.readdir.mockResolvedValueOnce(['random.pdf', 'pdf-to-skip.pdf']);
    await service.convertToPDF('/in/slides.pptx', '/out/slides.pdf');
    expect(mocks.fs.rename).toHaveBeenCalledWith('/out/random.pdf', '/out/slides.pdf');

    mocks.fs.readdir.mockResolvedValueOnce(['nothing.txt']);
    await expect(service.convertToPDF('/in/a.docx', '/out/a.pdf')).rejects.toThrow('Failed to convert office document to PDF');
  });

  it('converts PDF to Word and handles missing output', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['converted.docx']);
    await service.pdfToWord('/in/a.pdf', '/out/a.docx');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith('/out/a.html', expect.stringContaining('Content from PDF page 1'));
    expect(execFile).toHaveBeenCalledWith('libreoffice', ['--headless', '--convert-to', 'docx', '--outdir', '/out', '/out/a.html'], expect.any(Function));
    expect(mocks.fs.unlink).toHaveBeenCalledWith('/out/a.html');

    mocks.fs.readdir.mockResolvedValueOnce([]);
    mocks.fs.access.mockRejectedValueOnce(new Error('missing'));
    await expect(service.pdfToWord('/in/a.pdf', '/out/a.docx')).rejects.toThrow('Failed to convert PDF to Word');
  });

  it('converts PDF to Excel and handles missing output', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['table.xlsx']);
    await service.pdfToExcel('/in/a.pdf', '/out/a.xlsx');

    expect(mocks.fs.writeFile).toHaveBeenCalledWith('/out/a.csv', expect.stringContaining('Page,Content,Note'));
    expect(mocks.fs.rename).toHaveBeenCalledWith('/out/table.xlsx', '/out/a.xlsx');

    mocks.fs.readdir.mockResolvedValueOnce([]);
    mocks.fs.access.mockRejectedValueOnce(new Error('missing'));
    await expect(service.pdfToExcel('/in/a.pdf', '/out/a.xlsx')).rejects.toThrow('Failed to convert PDF to Excel');
  });

  it('converts PDF to PowerPoint through extracted PNGs, fallback names, no-pages, and missing output', async () => {
    mocks.fs.readdir.mockResolvedValueOnce(['page-2.png', 'page-1.png']).mockResolvedValueOnce(['slides.pptx']);
    await service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx');
    expect(execFile).toHaveBeenCalledWith('pdftoppm', ['-png', '-r', '150', '/in/a.pdf', expect.stringContaining('/out/pptx_temp_')], expect.any(Function));
    expect(mocks.fs.rename).toHaveBeenCalledWith('/out/slides.pptx', '/out/a.pptx');
    expect(mocks.fs.rm).toHaveBeenCalledWith(expect.stringContaining('/out/pptx_temp_'), { recursive: true, force: true });

    mocks.fs.readdir.mockResolvedValueOnce(['page.png']).mockResolvedValueOnce(['other.pptx']);
    await service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx');
    expect(mocks.fs.rename).toHaveBeenCalledWith('/out/other.pptx', '/out/a.pptx');

    mocks.fs.readdir.mockResolvedValueOnce([]);
    await expect(service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx')).rejects.toThrow('No pages extracted');

    mocks.fs.readdir.mockResolvedValueOnce(['page.png']).mockResolvedValueOnce([]);
    mocks.fs.access.mockRejectedValueOnce(new Error('missing'));
    await expect(service.pdfToPowerPoint('/in/a.pdf', '/out/a.pptx')).rejects.toThrow('Failed to generate PPTX');
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
