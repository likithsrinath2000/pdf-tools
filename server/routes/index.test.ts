import express from "express";
import { createServer } from "node:http";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: { getRecentJobs: vi.fn(async () => []) },
  logRequest: vi.fn(),
  observe: vi.fn(),
  metrics: vi.fn(async () => "# HELP active_jobs Number of currently active jobs\nactive_jobs 0\n"),
}));

vi.mock("../storage", () => ({ storage: mocks.storage }));
vi.mock("../logger", () => ({ logRequest: mocks.logRequest, logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../metrics", () => ({
  register: { contentType: "text/plain; version=0.0.4", metrics: mocks.metrics },
  httpRequestDuration: { observe: mocks.observe },
  jobsProcessed: { inc: vi.fn() }, activeJobs: { inc: vi.fn(), dec: vi.fn() }, fileSizeProcessed: { observe: vi.fn() },
}));
vi.mock("./pdf.routes", async () => ({ default: (await import("express")).Router() }));
vi.mock("./job.routes", async () => ({ default: (await import("express")).Router() }));
vi.mock("./image.routes", async () => ({ default: (await import("express")).Router() }));
vi.mock("./office.routes", async () => ({ default: (await import("express")).Router() }));
vi.mock("./feedback.routes", async () => ({ default: (await import("express")).Router() }));

describe("registerRoutes", () => {
  let registerRoutes: typeof import("./index").registerRoutes;
  beforeEach(async () => {
    vi.clearAllMocks();
    registerRoutes = (await import("./index")).registerRoutes;
  });

  it("registers health and metrics endpoints with request metrics", async () => {
    const app = express();
    await registerRoutes(createServer(app), app);
    const health = await request(app).get("/api/health");
    expect(health.body).toMatchObject({ status: "ok", database: "connected" });
    expect(mocks.storage.getRecentJobs).toHaveBeenCalledWith(1);

    const metrics = await request(app).get("/api/metrics");
    expect(metrics.text).toContain("active_jobs");
    expect(metrics.headers["content-type"]).toContain("text/plain");
    expect(mocks.logRequest).toHaveBeenCalled();
    expect(mocks.observe).toHaveBeenCalled();
  });

  it("reports database health failures", async () => {
    mocks.storage.getRecentJobs.mockRejectedValueOnce(new Error("db down"));
    const app = express();
    await registerRoutes(createServer(app), app);
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "error", database: "disconnected" });
  });
});
