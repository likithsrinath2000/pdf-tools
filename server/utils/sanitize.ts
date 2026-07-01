import path from "path";
import type { ProcessingJob } from "@shared/schema";

/**
 * Strips server-side filesystem paths from a message so internal directory
 * structure (e.g. `output_files/…`, `/app/uploads/…`) is never leaked to
 * clients via error responses or the job-status API. Human-readable, path-free
 * messages (e.g. "INVALID_PASSWORD: …") are preserved unchanged.
 */
export function sanitizeErrorMessage(message?: string | null): string {
  if (!message || typeof message !== "string") {
    return "An unexpected error occurred. Please try again.";
  }

  return message
    // Absolute POSIX paths (two or more segments) → placeholder.
    .replace(/(?:\/[\w.\-]+){2,}\/?/g, "[path]")
    // Managed relative directories.
    .replace(/\b(?:uploads|output_files)\/[\w.\-/]*/g, "[path]")
    .trim();
}

/**
 * Returns a client-safe copy of a job. Filesystem paths in `outputFile`,
 * `inputFiles`, and `error` are reduced to basenames / sanitized so the
 * server's internal directory layout is not disclosed. The client only needs
 * the output filename (for its extension) and the error text.
 */
export function sanitizeJobForClient(job: ProcessingJob): ProcessingJob {
  const sanitized: any = { ...job };

  if (job.outputFile) {
    sanitized.outputFile = path.basename(job.outputFile);
  }

  if (Array.isArray(job.inputFiles)) {
    sanitized.inputFiles = (job.inputFiles as any[]).map((f) =>
      f && typeof f === "object"
        ? { ...f, path: f.path ? path.basename(f.path) : f.path }
        : f
    );
  }

  if (job.error) {
    sanitized.error = sanitizeErrorMessage(job.error);
  }

  return sanitized as ProcessingJob;
}
