import fs from 'fs/promises';
import path from 'path';
import { logger, logCleanup } from '../logger';
import { positiveIntEnv } from '../utils/env';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
// Processed results live here. This MUST be cleaned too — otherwise output
// documents (which can be sensitive) accumulate forever and could be served to
// whoever holds the job id.
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), 'output_files');

/**
 * Effective retention. Defaults to 5 minutes. `FILE_MAX_AGE_MINUTES` takes
 * precedence; the legacy `FILE_MAX_AGE_HOURS` is still honored when minutes is
 * not set. Invalid/non-positive values fall back to the default so a
 * misconfiguration can never produce a NaN cutoff.
 */
function resolveMaxAgeMs(): number {
  const DEFAULT_MS = 5 * 60 * 1000;
  if (process.env.FILE_MAX_AGE_MINUTES) {
    return positiveIntEnv(process.env.FILE_MAX_AGE_MINUTES, 5) * 60 * 1000;
  }
  if (process.env.FILE_MAX_AGE_HOURS) {
    return positiveIntEnv(process.env.FILE_MAX_AGE_HOURS, 1) * 60 * 60 * 1000;
  }
  return DEFAULT_MS;
}

const FILE_MAX_AGE_MS = resolveMaxAgeMs();
// Sweep frequently so files don't linger much past their retention window.
const CLEANUP_INTERVAL_MS = positiveIntEnv(process.env.CLEANUP_INTERVAL_MINUTES, 1) * 60 * 1000;

export class CleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  // Optional hook to purge stale DB job rows, injected at startup so this
  // service stays free of a direct database dependency (and unit-testable
  // without a DB). Best-effort: DB failures never block file cleanup.
  private jobRecordPurger: ((cutoff: Date) => Promise<number>) | null = null;

  setJobRecordPurger(purger: (cutoff: Date) => Promise<number>): void {
    this.jobRecordPurger = purger;
  }

  async cleanupOldFiles(): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;
    const now = Date.now();

    // Clean every managed root (uploads + processed outputs).
    for (const root of [UPLOADS_DIR, OUTPUT_DIR]) {
      const result = await this.cleanupDirectory(root, now, false);
      filesDeleted += result.filesDeleted;
      bytesFreed += result.bytesFreed;
    }

    if (filesDeleted > 0) {
      logCleanup(filesDeleted, bytesFreed);
    }

    // Purge stale job records so the DB doesn't accumulate rows indefinitely.
    if (this.jobRecordPurger) {
      try {
        const removed = await this.jobRecordPurger(new Date(now - FILE_MAX_AGE_MS));
        if (removed > 0) {
          logger.debug(`Removed ${removed} stale job record(s)`);
        }
      } catch (error: any) {
        logger.error('Job record cleanup error:', { error: error.message });
      }
    }

    return { filesDeleted, bytesFreed };
  }

  /**
   * Recursively removes files older than the retention window. `isSubdir`
   * distinguishes managed roots (never removed even when empty) from per-job
   * subdirectories (removed once empty).
   */
  private async cleanupDirectory(
    dirPath: string,
    now: number,
    isSubdir: boolean
  ): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const result = await this.cleanupDirectory(entryPath, now, true);
          filesDeleted += result.filesDeleted;
          bytesFreed += result.bytesFreed;
        } else if (entry.isFile()) {
          const result = await this.cleanupFile(entryPath, now);
          if (result) {
            filesDeleted += 1;
            bytesFreed += result;
          }
        }
      }

      // Remove now-empty per-job subdirectories (never the managed roots).
      if (isSubdir) {
        const remainingEntries = await fs.readdir(dirPath);
        if (remainingEntries.length === 0) {
          await fs.rmdir(dirPath);
          logger.debug(`Removed empty directory: ${dirPath}`);
        }
      }
    } catch (error: any) {
      // A managed root that doesn't exist yet is not an error.
      if (error.code === 'ENOENT') {
        return { filesDeleted, bytesFreed };
      }
      if (isSubdir) {
        logger.error('Directory cleanup error:', { dirPath, error: error.message });
      } else {
        logger.error('Cleanup error:', { error: error.message });
      }
    }

    return { filesDeleted, bytesFreed };
  }

  private async cleanupFile(filePath: string, now: number): Promise<number | null> {
    try {
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > FILE_MAX_AGE_MS) {
        await fs.unlink(filePath);
        logger.debug(`Deleted old file: ${path.basename(filePath)}`, { 
          age: `${Math.floor(age / 3600000)}h`,
          size: `${(stats.size / 1024).toFixed(1)}KB`
        });
        return stats.size;
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error('File cleanup error:', { filePath, error: error.message });
      }
    }

    return null;
  }

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.cleanupOldFiles();

    this.intervalId = setInterval(() => {
      this.cleanupOldFiles();
    }, CLEANUP_INTERVAL_MS);

    logger.info(`Cleanup service started: ${FILE_MAX_AGE_MS / 60000}min max age, ${CLEANUP_INTERVAL_MS / 60000}min interval`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Cleanup service stopped');
    }
  }
}

export const cleanupService = new CleanupService();
