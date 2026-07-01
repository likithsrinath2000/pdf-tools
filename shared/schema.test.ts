import { describe, expect, it } from "vitest";
import { feedbacks, insertFeedbackSchema, insertProcessingJobSchema, processingJobs } from "./schema";

describe("shared schema", () => {
  it("defines processing job table and validates inserts", () => {
    expect(processingJobs).toBeDefined();
    expect(processingJobs.id).toBeDefined();
    const parsed = insertProcessingJobSchema.parse({
      toolId: "merge-pdf",
      status: "processing",
      progress: 0,
      inputFiles: [{ path: "uploads/a.pdf", originalName: "a.pdf", size: 1, mimetype: "application/pdf" }],
      options: { quality: "medium" },
    });
    expect(parsed.toolId).toBe("merge-pdf");
    expect(() => insertProcessingJobSchema.parse({ status: "processing", inputFiles: [] })).toThrow();
    expect(() => insertProcessingJobSchema.parse({ toolId: "x", status: "processing" })).toThrow();
  });

  it("defines feedback table and validates inserts", () => {
    expect(feedbacks).toBeDefined();
    expect(feedbacks.createdAt).toBeDefined();
    expect(insertFeedbackSchema.parse({ feedback: "Nice", email: "a@example.com", userAgent: null, ipAddress: null })).toEqual(
      expect.objectContaining({ feedback: "Nice" }),
    );
    expect(() => insertFeedbackSchema.parse({ email: "a@example.com" })).toThrow();
  });
});
