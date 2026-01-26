import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pdftools' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export function logJobCreated(jobId: string, toolId: string, fileCount: number) {
  logger.info('Job created', { jobId, toolId, fileCount });
}

export function logJobCompleted(jobId: string, toolId: string, duration: number) {
  logger.info('Job completed', { jobId, toolId, duration });
}

export function logJobFailed(jobId: string, toolId: string, error: string) {
  logger.error('Job failed', { jobId, toolId, error });
}

export function logRequest(method: string, path: string, duration: number, statusCode: number) {
  logger.info('HTTP Request', { method, path, duration, statusCode });
}
