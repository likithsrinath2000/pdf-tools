import { describe, it, expect } from "vitest";
import { sanitizeErrorMessage, sanitizeJobForClient } from "./sanitize";

describe("sanitizeErrorMessage", () => {
  it("returns a generic message for empty/invalid input", () => {
    expect(sanitizeErrorMessage("")).toBe("An unexpected error occurred. Please try again.");
    expect(sanitizeErrorMessage(null)).toBe("An unexpected error occurred. Please try again.");
    expect(sanitizeErrorMessage(undefined)).toBe("An unexpected error occurred. Please try again.");
  });

  it("strips absolute filesystem paths", () => {
    const out = sanitizeErrorMessage("ENOENT: no such file, open '/app/output_files/merge_123.pdf'");
    expect(out).not.toContain("/app/output_files");
    expect(out).toContain("[path]");
  });

  it("strips managed relative directories", () => {
    expect(sanitizeErrorMessage("failed reading uploads/abc123")).toContain("[path]");
    expect(sanitizeErrorMessage("wrote output_files/x.pdf")).toContain("[path]");
  });

  it("preserves human-readable, path-free messages", () => {
    expect(sanitizeErrorMessage("INVALID_PASSWORD: The password you entered is incorrect.")).toBe(
      "INVALID_PASSWORD: The password you entered is incorrect."
    );
    expect(sanitizeErrorMessage("A password is required to protect this PDF.")).toBe(
      "A password is required to protect this PDF."
    );
  });
});

describe("sanitizeJobForClient", () => {
  it("reduces outputFile and inputFiles paths to basenames and sanitizes errors", () => {
    const job: any = {
      id: "job-1",
      status: "completed",
      outputFile: "output_files/merge-pdf_abc.pdf",
      inputFiles: [{ path: "uploads/in-1.pdf", size: 10 }, "raw"],
      error: "boom at /app/uploads/in-1.pdf",
    };
    const out: any = sanitizeJobForClient(job);
    expect(out.outputFile).toBe("merge-pdf_abc.pdf");
    expect(out.inputFiles[0].path).toBe("in-1.pdf");
    expect(out.inputFiles[0].size).toBe(10);
    expect(out.inputFiles[1]).toBe("raw");
    expect(out.error).toContain("[path]");
    // Original is untouched.
    expect(job.outputFile).toBe("output_files/merge-pdf_abc.pdf");
  });

  it("leaves absent fields untouched", () => {
    const job: any = { id: "job-2", status: "processing", outputFile: null, inputFiles: null, error: null };
    const out: any = sanitizeJobForClient(job);
    expect(out.outputFile).toBeNull();
    expect(out.inputFiles).toBeNull();
    expect(out.error).toBeNull();
  });
});
