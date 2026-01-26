import fs from 'fs/promises';
import path from 'path';
import { logger, logCleanup } from '../logger';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
const FILE_MAX_AGE_MS = parseInt(process.env.FILE_MAX_AGE_HOURS || '24') * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60') * 60 * 1000;

export class CleanupService {
  private intervalId: NodeJS.Timeout | null = null;

  async cleanupOldFiles(): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;
    const now = Date.now();

    try {
      const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(UPLOADS_DIR, entry.name);

        if (entry.isDirectory()) {
          const result = await this.cleanupDirectory(entryPath, now);
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

      if (filesDeleted > 0) {
        logCleanup(filesDeleted, bytesFreed);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error('Cleanup error:', { error: error.message });
      }
    }

    return { filesDeleted, bytesFreed };
  }

  private async cleanupDirectory(dirPath: string, now: number): Promise<{ filesDeleted: number; bytesFreed: number }> {
    let filesDeleted = 0;
    let bytesFreed = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isFile()) {
          const result = await this.cleanupFile(entryPath, now);
          if (result) {
            filesDeleted += 1;
            bytesFreed += result;
          }
        }
      }

      const remainingEntries = await fs.readdir(dirPath);
      if (remainingEntries.length === 0) {
        await fs.rmdir(dirPath);
        logger.debug(`Removed empty directory: ${dirPath}`);
      }
    } catch (error: any) {
      logger.error('Directory cleanup error:', { dirPath, error: error.message });
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

    logger.info(`Cleanup service started: ${FILE_MAX_AGE_MS / 3600000}h max age, ${CLEANUP_INTERVAL_MS / 60000}min interval`);
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
