import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const logLevel = process.env.LOG_LEVEL || 'info';
const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
});

const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
});

const combinedRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '7d',
  zippedArchive: true,
});

const accessRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'info',
  maxSize: '50m',
  maxFiles: '7d',
  zippedArchive: true,
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pdftools' },
  transports: [
    errorRotateTransport,
    combinedRotateTransport,
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      customFormat
    ),
  }));
} else {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.json()
    ),
  }));
}

export function logJobCreated(jobId: string, toolId: string, fileCount: number, options?: any) {
  logger.info(`Job created: ${toolId}`, { 
    jobId, 
    toolId, 
    fileCount,
    options: options ? JSON.stringify(options) : 'none'
  });
}

export function logJobProgress(jobId: string, toolId: string, progress: number, stage: string) {
  logger.debug(`Job progress: ${toolId} @ ${progress}%`, { jobId, toolId, progress, stage });
}

export function logJobCompleted(jobId: string, toolId: string, duration: number, outputSize?: number) {
  logger.info(`Job completed: ${toolId} in ${duration.toFixed(2)}s`, { 
    jobId, 
    toolId, 
    duration: `${duration.toFixed(2)}s`,
    outputSize: outputSize ? `${(outputSize / 1024 / 1024).toFixed(2)}MB` : 'unknown'
  });
}

export function logJobFailed(jobId: string, toolId: string, error: string, stack?: string) {
  logger.error(`Job failed: ${toolId}`, { 
    jobId, 
    toolId, 
    error,
    stack: stack?.substring(0, 500)
  });
}

export function logRequest(method: string, path: string, duration: number, statusCode: number) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, `${method} ${path} ${statusCode}`, { 
    method, 
    path, 
    duration: `${duration}ms`, 
    statusCode 
  });
}

export function logFileOperation(operation: string, filePath: string, success: boolean, details?: string) {
  if (success) {
    logger.debug(`File ${operation}: ${path.basename(filePath)}`, { operation, filePath, details });
  } else {
    logger.warn(`File ${operation} failed: ${path.basename(filePath)}`, { operation, filePath, details });
  }
}

export function logToolExecution(toolId: string, jobId: string, inputFiles: string[], options?: any) {
  logger.info(`Executing tool: ${toolId}`, {
    jobId,
    toolId,
    inputFiles: inputFiles.map(f => path.basename(f)),
    options: options ? JSON.stringify(options) : 'default'
  });
}

export function logDatabaseOperation(operation: string, table: string, success: boolean, duration?: number) {
  if (success) {
    logger.debug(`DB ${operation} on ${table}`, { operation, table, duration: duration ? `${duration}ms` : undefined });
  } else {
    logger.error(`DB ${operation} failed on ${table}`, { operation, table });
  }
}

export function logStartup(port: number, env: string) {
  logger.info(`Server started on port ${port}`, { port, environment: env });
}

export function logHealthCheck(status: 'healthy' | 'unhealthy', details?: Record<string, any>) {
  if (status === 'healthy') {
    logger.debug('Health check passed', details);
  } else {
    logger.warn('Health check failed', details);
  }
}

export function logCleanup(filesDeleted: number, bytesFreed: number) {
  logger.info(`Cleanup completed: ${filesDeleted} files, ${(bytesFreed / 1024 / 1024).toFixed(2)}MB freed`);
}
