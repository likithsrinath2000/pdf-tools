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
  process.env.OUTPUT_DIR = '/outputs';
  process.env.FILE_MAX_AGE_MINUTES = '5';
  process.env.CLEANUP_INTERVAL_MINUTES = '5';
  delete process.env.FILE_MAX_AGE_HOURS;
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
    delete process.env.OUTPUT_DIR;
    delete process.env.FILE_MAX_AGE_MINUTES;
    delete process.env.FILE_MAX_AGE_HOURS;
    delete process.env.CLEANUP_INTERVAL_MINUTES;
  });

  it('cleans BOTH uploads and outputs, recurses, and honors a minute-based retention', async () => {
    const now = new Date('2026-07-01T00:00:00Z').getTime();
    vi.setSystemTime(now);
    const { CleanupService } = await loadService();
    fsMocks.readdir.mockImplementation(async (p: string, opts?: any) => {
      if (p === '/uploads' && opts?.withFileTypes) return [file('old.pdf'), file('new.pdf'), dir('job')];
      if (p === '/uploads/job' && opts?.withFileTypes) return [file('nested.pdf')];
      if (p === '/uploads/job') return [];
      // output_files with a per-job subdir that itself nests one level deeper
      if (p === '/outputs' && opts?.withFileTypes) return [dir('pdf2img_1')];
      if (p === '/outputs/pdf2img_1' && opts?.withFileTypes) return [file('page-1.jpg')];
      if (p === '/outputs/pdf2img_1') return [];
      return [];
    });
    fsMocks.stat.mockImplementation(async (p: string) => ({
      // 6 minutes old => older than the 5-minute retention (except 'new')
      mtimeMs: p.includes('new') ? now - 10 : now - 6 * 60 * 1000,
      size: p.includes('nested') ? 200 : 100,
    }));

    // old.pdf(100) + nested.pdf(200) + page-1.jpg(100) = 3 files, 400 bytes
    await expect(new CleanupService().cleanupOldFiles()).resolves.toEqual({ filesDeleted: 3, bytesFreed: 400 });

    expect(fsMocks.unlink).toHaveBeenCalledWith('/uploads/old.pdf');
    expect(fsMocks.unlink).toHaveBeenCalledWith('/uploads/job/nested.pdf');
    expect(fsMocks.unlink).toHaveBeenCalledWith('/outputs/pdf2img_1/page-1.jpg');
    // empty per-job subdirs are removed, managed roots are not
    expect(fsMocks.rmdir).toHaveBeenCalledWith('/uploads/job');
    expect(fsMocks.rmdir).toHaveBeenCalledWith('/outputs/pdf2img_1');
    expect(fsMocks.rmdir).not.toHaveBeenCalledWith('/uploads');
    expect(fsMocks.rmdir).not.toHaveBeenCalledWith('/outputs');
    expect(loggerMocks.logCleanup).toHaveBeenCalledWith(3, 400);
  });

  it('ignores missing managed dirs and file ENOENT but logs other errors', async () => {
    const { CleanupService } = await loadService();
    // Both roots ENOENT -> nothing deleted, no error logged
    fsMocks.readdir.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    await expect(new CleanupService().cleanupOldFiles()).resolves.toEqual({ filesDeleted: 0, bytesFreed: 0 });
    expect(loggerMocks.logger.error).not.toHaveBeenCalled();

    // A stat EACCES on a file is logged as a file cleanup error
    fsMocks.readdir.mockReset();
    fsMocks.readdir.mockResolvedValue([]);
    fsMocks.readdir.mockResolvedValueOnce([file('bad.pdf')]);
    fsMocks.stat.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'EACCES' }));
    await new CleanupService().cleanupOldFiles();
    expect(loggerMocks.logger.error).toHaveBeenCalledWith('File cleanup error:', expect.objectContaining({ filePath: '/uploads/bad.pdf' }));

    // A non-ENOENT error reading a managed root is logged as 'Cleanup error'
    fsMocks.readdir.mockReset();
    fsMocks.readdir.mockResolvedValue([]);
    fsMocks.readdir.mockRejectedValueOnce(new Error('top-level'));
    await new CleanupService().cleanupOldFiles();
    expect(loggerMocks.logger.error).toHaveBeenCalledWith('Cleanup error:', { error: 'top-level' });
  });

  it('logs subdirectory cleanup errors distinctly', async () => {
    const { CleanupService } = await loadService();
    fsMocks.readdir.mockImplementation(async (p: string, opts?: any) => {
      if (p === '/uploads' && opts?.withFileTypes) return [dir('bad')];
      if (p === '/uploads/bad') throw new Error('dir failed');
      return [];
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
