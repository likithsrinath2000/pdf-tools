import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as device from './deviceCapabilities';
import {
  canProcessClientSide,
  canProcessClientSideAsync,
  downloadBlob,
  getClientCapabilities,
  getDeviceCapabilitiesInfo,
  processClientSide,
  terminateWorkers,
} from './clientProcessing';

vi.mock('./deviceCapabilities', async () => {
  const actual = await vi.importActual<typeof import('./deviceCapabilities')>('./deviceCapabilities');
  return {
    ...actual,
    getDeviceCapabilities: vi.fn(),
    shouldUseClientProcessing: vi.fn(),
    checkCurrentMemoryPressure: vi.fn(),
    formatCapabilities: vi.fn(() => 'formatted capabilities'),
  };
});

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(public url: URL, public options?: WorkerOptions) {
    FakeWorker.instances.push(this);
  }
  resolve(result: unknown) {
    const message = this.postMessage.mock.calls.at(-1)?.[0];
    this.onmessage?.({ data: { id: message.id, success: true, result } } as MessageEvent);
  }
  reject(error: string) {
    const message = this.postMessage.mock.calls.at(-1)?.[0];
    this.onmessage?.({ data: { id: message.id, success: false, error } } as MessageEvent);
  }
  progress(progress: number) {
    const message = this.postMessage.mock.calls.at(-1)?.[0];
    this.onmessage?.({ data: { id: message.id, progress } } as MessageEvent);
  }
}

const file = (name = 'input.pdf', size = 10, type = 'application/pdf') => new File([new Uint8Array(size)], name, { type });
const caps = {
  memoryGB: 8,
  cpuCores: 8,
  isMobile: false,
  isLowEndDevice: false,
  performanceScore: 100,
  jsHeapSizeMB: 10,
  jsHeapLimitMB: 1000,
  memoryPressure: 'low' as const,
  isOnBattery: false,
  batteryLevel: 1,
  isLowPower: false,
  connectionType: '4g',
  downlinkMbps: 10,
  isSlowConnection: false,
  recommendation: 'client' as const,
  reasons: ['ok'],
};

beforeEach(() => {
  terminateWorkers();
  FakeWorker.instances = [];
  vi.mocked(device.checkCurrentMemoryPressure).mockReturnValue('low');
  vi.mocked(device.getDeviceCapabilities).mockResolvedValue(caps);
  vi.mocked(device.shouldUseClientProcessing).mockReturnValue({ useClient: true, reason: 'ok' });
  Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
  Object.defineProperty(globalThis, 'OffscreenCanvas', { value: class {}, configurable: true });
});

afterEach(() => {
  terminateWorkers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('clientProcessing capability checks', () => {
  it('rejects server-only, unknown, unsupported APIs, high pressure, and oversized files', () => {
    expect(canProcessClientSide('compress-pdf', [file()]).reason).toMatch(/requires server-side/);
    expect(canProcessClientSide('unknown', [file()]).reason).toMatch(/not configured/);

    Object.defineProperty(globalThis, 'OffscreenCanvas', { value: undefined, configurable: true });
    expect(canProcessClientSide('compress-image', [file('a.jpg')]).reason).toMatch(/OffscreenCanvas/);

    Object.defineProperty(globalThis, 'OffscreenCanvas', { value: class {}, configurable: true });
    Object.defineProperty(globalThis, 'Worker', { value: undefined, configurable: true });
    expect(canProcessClientSide('merge-pdf', [file()]).reason).toMatch(/Web Workers/);

    Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
    vi.mocked(device.checkCurrentMemoryPressure).mockReturnValue('high');
    expect(canProcessClientSide('merge-pdf', [file()]).reason).toMatch(/High memory pressure/);

    vi.mocked(device.checkCurrentMemoryPressure).mockReturnValue('low');
    expect(canProcessClientSide('merge-pdf', [file('huge.pdf', 51 * 1024 * 1024)]).reason).toMatch(/too large/);
    expect(canProcessClientSide('compress-image', [file('huge.jpg', 17 * 1024 * 1024, 'image/jpeg')]).reason).toMatch(/too large/);
    expect(canProcessClientSide('merge-pdf', [file()])).toEqual({ canProcess: true });
  });

  it('uses async device capabilities or falls back to sync decisions', async () => {
    expect(await canProcessClientSideAsync('compress-pdf', [file()])).toMatchObject({ canProcess: false });

    vi.mocked(device.shouldUseClientProcessing).mockReturnValueOnce({ useClient: false, reason: 'server better' });
    await expect(canProcessClientSideAsync('merge-pdf', [file()])).resolves.toMatchObject({
      canProcess: false,
      reason: 'server better',
      capabilities: caps,
    });

    vi.mocked(device.getDeviceCapabilities).mockRejectedValueOnce(new Error('no api'));
    await expect(canProcessClientSideAsync('rotate-pdf', [file()])).resolves.toMatchObject({ canProcess: true });
  });

  it('reports client and cached device capabilities', async () => {
    const info = getClientCapabilities();
    expect(info.webWorkersSupported).toBe(true);
    expect(info.offscreenCanvasSupported).toBe(true);
    expect(info.clientProcessableTools).toEqual(expect.arrayContaining(['merge-pdf', 'compress-image']));
    expect(info.serverOnlyTools).toContain('compress-pdf');
    await expect(getDeviceCapabilitiesInfo()).resolves.toEqual(caps);
  });
});

describe('processClientSide', () => {
  const pdfCases: Array<[string, any, (payload: any) => void]> = [
    ['merge-pdf', { pageOrder: [1, 0] }, p => expect(p).toMatchObject({ files: expect.any(Array), options: { pageOrder: [1, 0] } })],
    ['split-pdf', { ranges: [{ start: 1, end: 2 }] }, p => expect(p.ranges).toEqual([{ start: 1, end: 2 }])],
    ['remove-pages', { pagesToRemove: [2] }, p => expect(p.pagesToRemove).toEqual([2])],
    ['extract-pages', { pages: [3] }, p => expect(p.pagesToExtract).toEqual([3])],
    ['organize-pdf', { pageOrder: [2, 1], rotations: { 1: 90 } }, p => expect(p).toMatchObject({ pageOrder: [2, 1], rotations: { 1: 90 } })],
    ['rotate-pdf', {}, p => expect(p.angle).toBe(90)],
    ['add-page-numbers', { position: 'bottom' }, p => expect(p.options.position).toBe('bottom')],
    ['add-watermark', { watermarkText: 'Draft' }, p => expect(p.options.text).toBe('Draft')],
    ['edit-pdf', { annotations: [{ text: 'x' }] }, p => expect(p.annotations).toHaveLength(1)],
    ['sign-pdf', { signature: 'sig' }, p => expect(p.options.signature).toBe('sig')],
    ['repair-pdf', {}, p => expect(p.file.name).toBe('input.pdf')],
    ['jpg-to-pdf', {}, p => expect(p.files).toHaveLength(1)],
    ['scan-pdf', {}, p => expect(p.files).toHaveLength(1)],
  ];

  it.each(pdfCases)('builds payload and result for %s', async (toolId, options, assertPayload) => {
    vi.useFakeTimers().setSystemTime(9876);
    const progress = vi.fn();
    const promise = processClientSide(toolId, [file()], options, progress);
    const worker = FakeWorker.instances[0];
    const message = worker.postMessage.mock.calls[0][0];
    expect(message.type).toBe(toolId);
    assertPayload(message.payload);
    worker.progress(50);
    worker.resolve(toolId === 'split-pdf' ? [new Uint8Array([1, 2])] : new Uint8Array([1, 2, 3]));

    await expect(promise).resolves.toMatchObject({
      success: true,
      outputFileName: expect.stringMatching(new RegExp(`^${toolId}_input_9876\\.pdf$`)),
      processedClientSide: true,
    });
    expect(progress).toHaveBeenCalledWith(10);
    expect(progress).toHaveBeenCalledWith(60);
    expect(progress).toHaveBeenCalledWith(100);
  });

  it.each([
    ['compress-image', { quality: 70 }, (p: any) => expect(p.quality).toBe(70), 'photo.png'],
    ['resize-image', { width: 10, height: 20, maintainAspectRatio: false }, (p: any) => expect(p.maintainAspectRatio).toBe(false), 'photo.jpg'],
    ['crop-image', { x: 1, y: 2, width: 3, height: 4 }, (p: any) => expect(p).toMatchObject({ left: 1, top: 2 }), 'photo.gif'],
    ['rotate-image', {}, (p: any) => expect(p.angle).toBe(90), 'photo.webp'],
    ['convert-image', { format: 'png' }, (p: any) => expect(p.format).toBe('png'), 'photo.webp'],
  ])('builds image payload and Blob result for %s', async (toolId, options, assertPayload, name) => {
    vi.useFakeTimers().setSystemTime(5);
    const resultBlob = new Blob(['image'], { type: 'image/png' });
    const promise = processClientSide(toolId, [file(name, 2, 'image/png')], options);
    const worker = FakeWorker.instances[0];
    expect(worker.postMessage.mock.calls[0][0].type).toBe(toolId);
    assertPayload(worker.postMessage.mock.calls[0][0].payload);
    worker.resolve(resultBlob);

    const result = await promise;
    expect(result.outputFile).toBe(resultBlob);
    expect(result.outputFileName).toContain(`${toolId}_photo_5.`);
  });

  it('throws for unknown tools and maps fallback worker errors', async () => {
    await expect(processClientSide('nope', [file()])).rejects.toThrow('cannot be processed');

    const promise = processClientSide('merge-pdf', [file()]);
    FakeWorker.instances[0].reject('UNSUPPORTED_FORMAT');
    await expect(promise).rejects.toThrow('CLIENT_FALLBACK: UNSUPPORTED_FORMAT');

    const large = processClientSide('merge-pdf', [file()]);
    FakeWorker.instances[0].reject('file too large');
    await expect(large).rejects.toThrow('CLIENT_FALLBACK: file too large');
  });

  it('rejects all pending work on worker errors and terminates workers', async () => {
    const promise = processClientSide('merge-pdf', [file()]);
    const worker = FakeWorker.instances[0];
    worker.onerror?.({ message: 'kaput' } as ErrorEvent);
    await expect(promise).rejects.toThrow('Worker error: kaput');
    terminateWorkers();
    expect(worker.terminate).toHaveBeenCalled();
  });
});

describe('downloadBlob', () => {
  it('creates an anchor, clicks it, and revokes the URL', () => {
    vi.useFakeTimers();
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBlob(new Blob(['x']), 'x.pdf');

    expect(click).toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revoke).toHaveBeenCalledWith('blob:download');
  });
});
