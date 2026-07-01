import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIClient, apiClient } from './api';

const okJson = (data: unknown) => ({ ok: true, json: vi.fn().mockResolvedValue(data) });
const badJson = (error: string) => ({ ok: false, json: vi.fn().mockResolvedValue({ error }) });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('APIClient', () => {
  it('creates jobs with files and options and exposes singleton', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson({ jobId: 'job-1' }) as any);
    const file = new File(['pdf'], 'a.pdf', { type: 'application/pdf' });

    await expect(apiClient.createJob('merge-pdf', [file], { order: [0] })).resolves.toEqual({ jobId: 'job-1' });

    expect(fetchMock).toHaveBeenCalledWith('/api/jobs', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(body.get('toolId')).toBe('merge-pdf');
    expect(body.get('options')).toBe(JSON.stringify({ order: [0] }));
  });

  it('throws API error messages for create and get failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(badJson('no create') as any).mockResolvedValueOnce(badJson('no get') as any);
    const client = new APIClient();
    await expect(client.createJob('x', [])).rejects.toThrow('no create');
    await expect(client.getJob('missing')).rejects.toThrow('no get');
  });

  it('gets a job and polls through processing to completed', async () => {
    vi.useFakeTimers();
    const processing = { id: 'job', status: 'processing', progress: 20 };
    const completed = { id: 'job', status: 'completed', progress: 100 };
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(okJson(processing) as any)
      .mockResolvedValueOnce(okJson(completed) as any);
    const progress = vi.fn();

    const promise = new APIClient().pollJobStatus('job', progress, 50);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(50);

    await expect(promise).resolves.toEqual(completed);
    expect(progress).toHaveBeenCalledWith(processing);
    expect(progress).toHaveBeenCalledWith(completed);
  });

  it('rejects polling on failed jobs and fetch errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(okJson({ id: 'job', status: 'failed', error: 'boom' }) as any);
    await expect(new APIClient().pollJobStatus('job')).rejects.toThrow('boom');

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));
    await expect(new APIClient().pollJobStatus('job')).rejects.toThrow('network');
  });

  it('downloads jobs and cleans up object URLs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1234);
    const blob = new Blob(['done'], { type: 'application/pdf' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, blob: vi.fn().mockResolvedValue(blob) } as any);
    Object.defineProperty(window.URL, 'createObjectURL', { value: vi.fn(), configurable: true });
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    const createObjectURL = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:url');
    const revokeObjectURL = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await new APIClient().downloadJob('job-1', 'out.pdf');

    expect(fetch).toHaveBeenCalledWith('/api/jobs/job-1/download?t=1234', { cache: 'no-store' });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });

  it('handles download, delete, and encryption checks', async () => {
    const client = new APIClient();
    expect(client.getDownloadUrl('abc')).toBe('/api/jobs/abc/download');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as any);
    await expect(client.downloadJob('abc')).rejects.toThrow('Failed to download file');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true } as any).mockResolvedValueOnce({ ok: false } as any);
    await expect(client.deleteJob('abc')).resolves.toBeUndefined();
    await expect(client.deleteJob('abc')).rejects.toThrow('Failed to delete job');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(okJson({ isEncrypted: true }) as any)
      .mockResolvedValueOnce({ ok: false } as any);
    await expect(client.checkPDFEncrypted(new File(['x'], 'x.pdf'))).resolves.toBe(true);
    await expect(client.checkPDFEncrypted(new File(['x'], 'x.pdf'))).rejects.toThrow('Failed to check PDF encryption');
  });
});
