import { beforeEach, describe, expect, it, vi } from 'vitest';

const out = new Uint8Array([1, 2, 3]);
const mkFile = (name = 'a.pdf', type = 'application/pdf') => Object.assign(new File([out], name, { type }), { arrayBuffer: vi.fn(async () => out.buffer.slice(0)) });

function page() {
  return {
    getRotation: vi.fn(() => ({ angle: 0 })), setRotation: vi.fn(), getSize: vi.fn(() => ({ width: 600, height: 800 })),
    drawText: vi.fn(), drawRectangle: vi.fn(), drawEllipse: vi.fn(), drawLine: vi.fn(), drawImage: vi.fn(),
  };
}
function doc() {
  const pages = [page(), page(), page()];
  return {
    getPageCount: vi.fn(() => pages.length), getPageIndices: vi.fn(() => [0, 1, 2]), getPages: vi.fn(() => pages),
    copyPages: vi.fn(async (_pdf, indices: number[]) => indices.map(() => page())), addPage: vi.fn((p?: any) => Array.isArray(p) || !p ? page() : p),
    embedFont: vi.fn(async () => ({ widthOfTextAtSize: (t: string, s: number) => t.length * s * .5 })),
    embedJpg: vi.fn(async () => ({ width: 10, height: 20 })), embedPng: vi.fn(async () => ({ width: 12, height: 22 })),
    save: vi.fn(async () => out),
  };
}

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: vi.fn(async () => doc()), load: vi.fn(async () => doc()) },
  rgb: vi.fn((r,g,b) => ({ r,g,b })), degrees: vi.fn((angle) => ({ angle })),
  StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold', TimesRoman: 'TimesRoman', TimesRomanBold: 'TimesRomanBold', TimesRomanItalic: 'TimesRomanItalic', Courier: 'Courier', CourierBold: 'CourierBold' },
}));

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

describe('pdf.worker', () => {
  async function load() {
    const fakeSelf: any = { postMessage: vi.fn(), onmessage: null };
    vi.stubGlobal('self', fakeSelf);
    await import('./pdf.worker');
    return fakeSelf;
  }
  async function send(self: any, type: string, payload: any, id = type) {
    await self.onmessage({ data: { id, type, payload } });
    return self.postMessage.mock.calls.at(-1)![0];
  }

  it('handles every pdf operation and errors', async () => {
    const self = await load(); const f = mkFile();
    const cases: [string, any][] = [
      ['merge-pdf', { files: [f, f] }], ['merge-pdf', { files: [f], options: { pageOrder: [{ fileIndex: 0, pageNumber: 1 }] } }],
      ['split-pdf', { file: f, ranges: [{ start: 1, end: 2 }] }], ['remove-pages', { file: f, pagesToRemove: [2] }], ['extract-pages', { file: f, pagesToExtract: [1,3] }],
      ['organize-pdf', { file: f, pageOrder: [], rotations: { 1: 90 } }], ['organize-pdf', { file: f, pageOrder: [3,1], rotations: { 3: 180 } }],
      ['rotate-pdf', { file: f, angle: 90 }], ['rotate-pages', { file: f, rotations: { 2: 270 } }],
      ['add-page-numbers', { file: f, options: { position: 'top-left', font: 'Times-Roman', isBold: true, format: 'roman', color: '#112233', startPage: 1, endPage: 2 } }],
      ['add-page-numbers', { file: f, options: { position: 'middle-right', font: 'Courier', format: 'letter' } }],
      ['add-page-numbers', { file: f, options: { format: 'page-of' } }],
      ['add-watermark', { file: f, options: { text: 'COPY', opacity: .5, orientation: 45, fontFamily: 'courier-bold' } }],
      ['edit-pdf', { file: f, annotations: [ { type: 'text', page: 1, x: 10, y: 10, text: 'A', color: '#000000' }, { type: 'rectangle', page: 1, x: 10, y: 10 }, { type: 'circle', page: 1, x: 10, y: 10 }, { type: 'line', page: 1, x: 1, y: 1, endX: 2, endY: 2 }, { type: 'highlight', page: 1, x: 3, y: 3 }, { type: 'freehand', page: 1, x: 0, y: 0, points: [{x:1,y:1},{x:2,y:2}] }, { type: 'bad', page: 99, x: 0, y: 0 } ] }],
      ['sign-pdf', { file: f, options: { signatureType: 'text', signatureText: 'Sig', signatureScale: 2, position: { page: 1, x: 10, y: 20 } } }],
      ['sign-pdf', { file: f, options: { signatureType: 'drawn', signatureImage: 'data:image/png;base64,QQ==', position: { page: 1, x: 10, y: 20 } } }],
      ['repair-pdf', { file: f }], ['jpg-to-pdf', { files: [mkFile('a.jpg','image/jpeg'), mkFile('b.png','image/png')] }], ['scan-pdf', { files: [mkFile('a.jpeg','image/jpeg')] }], ['get-pdf-info', { file: f }],
    ];
    for (const [type, payload] of cases) expect(await send(self, type, payload)).toMatchObject({ id: type, success: true });
    expect(await send(self, 'jpg-to-pdf', { files: [mkFile('x.gif','image/gif')] }, 'badimg')).toMatchObject({ id: 'badimg', success: false, error: 'UNSUPPORTED_FORMAT' });
    expect(await send(self, 'unknown', {}, 'bad')).toMatchObject({ id: 'bad', success: false, error: 'Unknown operation: unknown' });
  });
});

describe('image.worker', () => {
  function installCanvas(ctx: any = {}) {
    class FakeOffscreenCanvas { width: number; height: number; constructor(w: number, h: number) { this.width = w; this.height = h; } getContext = vi.fn(() => ({ drawImage: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillRect: vi.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: '', ...ctx })); convertToBlob = vi.fn(async (opts) => new Blob(['blob'], { type: opts.type })); }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas as any);
  }
  async function load(bitmap = { width: 100, height: 50, close: vi.fn() }) {
    const fakeSelf: any = { postMessage: vi.fn(), onmessage: null };
    vi.stubGlobal('self', fakeSelf); vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap)); installCanvas();
    await import('./image.worker'); return fakeSelf;
  }
  async function send(self: any, type: string, payload: any, id = type) { await self.onmessage({ data: { id, type, payload } }); return self.postMessage.mock.calls.at(-1)![0]; }

  it('processes image operations and guard branches', async () => {
    let self = await load(); const jpg = mkFile('a.jpg','image/jpeg');
    for (const [type, payload] of [
      ['compress-image', { file: jpg, quality: 60 }], ['resize-image', { file: jpg, width: 40, height: 40, maintainAspectRatio: true }], ['resize-image', { file: jpg, height: 20, maintainAspectRatio: true }], ['resize-image', { file: jpg, width: 20, maintainAspectRatio: false }], ['crop-image', { file: jpg, left: -1, top: 1, width: 20, height: 20 }], ['rotate-image', { file: jpg, angle: -90 }], ['convert-image', { file: jpg, format: 'jpg' }], ['convert-image', { file: mkFile('a.png','image/png'), format: 'png' }], ['convert-image', { file: mkFile('a.webp','image/webp'), format: 'webp' }], ['get-metadata', { file: jpg }],
    ] as any) expect(await send(self, type, payload)).toMatchObject({ id: type, success: true });
    expect(await send(self, 'crop-image', { file: jpg, left: 999, top: 1, width: 1, height: 1 }, 'badcrop')).toMatchObject({ success: false, error: 'Invalid crop dimensions' });
    expect(await send(self, 'missing', { file: jpg }, 'unknown')).toMatchObject({ success: false, error: 'Unknown operation: missing' });
    vi.resetModules(); self = await load({ width: 9000, height: 10, close: vi.fn() }); expect(await send(self, 'compress-image', { file: jpg, quality: 80 }, 'dim')).toMatchObject({ success: false, error: expect.stringContaining('dimension too large') });
    vi.resetModules(); self = await load({ width: 5000, height: 5000, close: vi.fn() }); expect(await send(self, 'resize-image', { file: jpg, maintainAspectRatio: false }, 'area')).toMatchObject({ success: false, error: expect.stringContaining('Image too large') });
    vi.resetModules(); const fakeSelf: any = { postMessage: vi.fn(), onmessage: null }; vi.stubGlobal('self', fakeSelf); vi.stubGlobal('OffscreenCanvas', undefined); await import('./image.worker'); await fakeSelf.onmessage({ data: { id: 'no', type: 'compress-image', payload: { file: jpg, quality: 80 } } }); expect(fakeSelf.postMessage).toHaveBeenCalledWith({ id: 'no', success: false, error: 'OFFSCREEN_CANVAS_NOT_SUPPORTED' });
  });
});
