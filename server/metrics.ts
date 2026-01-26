import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const jobsProcessed = new Counter({
  name: 'jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['tool_id', 'status'],
  registers: [register],
});

export const activeJobs = new Gauge({
  name: 'active_jobs',
  help: 'Number of currently active jobs',
  registers: [register],
});

export const fileSizeProcessed = new Histogram({
  name: 'file_size_processed_bytes',
  help: 'Size of files processed in bytes',
  labelNames: ['tool_id'],
  buckets: [1000, 10000, 100000, 1000000, 10000000, 100000000],
  registers: [register],
});

register.setDefaultLabels({
  app: 'pdftools',
  env: process.env.NODE_ENV || 'development',
});
