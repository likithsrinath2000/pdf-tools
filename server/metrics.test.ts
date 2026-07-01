import { describe, expect, it } from "vitest";
import { activeJobs, fileSizeProcessed, httpRequestDuration, jobsProcessed, register } from "./metrics";

describe("metrics", () => {
  it("records and renders prometheus metrics", async () => {
    httpRequestDuration.observe({ method: "GET", route: "/api/health", status_code: "200" }, 0.01);
    jobsProcessed.inc({ tool_id: "merge-pdf", status: "completed" });
    activeJobs.inc();
    activeJobs.dec();
    fileSizeProcessed.observe({ tool_id: "merge-pdf" }, 1234);

    const text = await register.metrics();
    expect(text).toContain("http_request_duration_seconds");
    expect(text).toContain("jobs_processed_total");
    expect(text).toContain("active_jobs");
    expect(text).toContain("file_size_processed_bytes");
    expect(text).toContain('app="pdftools"');
  });
});
