import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fsMocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
  logCleanup: vi.fn(),
}));

vi.mock('fs/promises', () => ({ default: fsMocks, ...fsMocks }));
vi.mock('../logger', () => loggerMocks);

const file = (name: string) => ({ name, isFile: () => true, isDirectory: () => false });
const dir = (name: string) => ({ name, isFile: () => false, isDirectory: () => true });

async function loadService() {
  vi.resetModules();
  process.env.UPLOADS_DIR = '/uploads';
  process.env.FILE_MAX_AGE_HOURS = '1';
  process.env.CLEANUP_INTERVAL_MINUTES = '5';
  return await import('./cleanup.service');
}

describe('CleanupService', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    fsMocks.unlink.mockResolvedValue(undefined);
    fsMocks.rmdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.UPLOADS_DIR;
    delete process.env.FILE_MAX_AGE_HOURS;
    delete process.env.CLEANUP_INTERVAL_MINUTES;
  });

  it('deletes old files in root and subdirectories and removes empty directories', async () => {
    const now = new Date('2026-07-01T00:00:00Z').getTime();
    vi.setSystemTime(now);
    const { CleanupService } = await loadService();
    fsMocks.readdir.mockImplementation(async (p: string, opts?: any) => {
      if (p === '/uploads' && opts?.withFileTypes) return [file('old.pdf'), file('new.pdf'), dir('job')];
      if (p === '/uploads/job' && opts?.withFileTypes) return [file('nested.pdf')];
      if (p === '/uploads/job') return [];
      return [];
    });
    fsMocks.stat.mockImplementation(async (p: string) => ({
      mtimeMs: p.includes('new') ? now - 10 : now - 2 * 60 * 60 * 1000,
      size: p.includes('nested') ? 200 : 100,
    }));

    await expect(new CleanupService().cleanupOldFiles()).resolves.toEqual({ filesDeleted: 2, bytesFreed: 300 });

    expect(fsMocks.unlink).toHaveBeenCalledWith('/uploads/old.pdf');
    expect(fsMocks.unlink).toHaveBeenCalledWith('/uploads/job/nested.pdf');
    expect(fsMocks.rmdir).toHaveBeenCalledWith('/uploads/job');
    expect(loggerMocks.logCleanup).toHaveBeenCalledWith(2, 300);
  });

  it('ignores missing uploads dir and file ENOENT but logs other errors', async () => {
    const { CleanupService } = await loadService();
    fsMocks.readdir.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    await expect(new CleanupService().cleanupOldFiles()).resolves.toEqual({ filesDeleted: 0, bytesFreed: 0 });
    expect(loggerMocks.logger.error).not.toHaveBeenCalled();

    fsMocks.readdir.mockResolvedValueOnce([file('bad.pdf')]);
    fsMocks.stat.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'EACCES' }));
    await new CleanupService().cleanupOldFiles();
    expect(loggerMocks.logger.error).toHaveBeenCalledWith('File cleanup error:', expect.objectContaining({ filePath: '/uploads/bad.pdf' }));

    fsMocks.readdir.mockRejectedValueOnce(new Error('top-level'));
    await new CleanupService().cleanupOldFiles();
    expect(loggerMocks.logger.error).toHaveBeenCalledWith('Cleanup error:', { error: 'top-level' });
  });

  it('logs directory cleanup errors', async () => {
    const { CleanupService } = await loadService();
    fsMocks.readdir.mockImplementation(async (p: string, opts?: any) => {
      if (p === '/uploads' && opts?.withFileTypes) return [dir('bad')];
      throw new Error('dir failed');
    });

    await new CleanupService().cleanupOldFiles();

    expect(loggerMocks.logger.error).toHaveBeenCalledWith('Directory cleanup error:', expect.objectContaining({ dirPath: '/uploads/bad' }));
  });

  it('starts once, runs periodic cleanup, and stops', async () => {
    vi.useFakeTimers();
    const { CleanupService } = await loadService();
    fsMocks.readdir.mockResolvedValue([]);
    const service = new CleanupService();
    const spy = vi.spyOn(service, 'cleanupOldFiles').mockResolvedValue({ filesDeleted: 0, bytesFreed: 0 });

    service.start();
    service.start();
    expect(spy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(spy).toHaveBeenCalledTimes(2);
    service.stop();
    service.stop();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(loggerMocks.logger.info).toHaveBeenCalledWith(expect.stringContaining('Cleanup service started'));
    expect(loggerMocks.logger.info).toHaveBeenCalledWith('Cleanup service stopped');
  });
});
