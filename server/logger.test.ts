import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const mockLogger = {
    info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn(), add: vi.fn(),
  };
  const formatFn = () => ({});
  return { mockLogger, formatFn };
});

vi.mock("winston", () => ({
  default: {
    createLogger: vi.fn(() => mocks.mockLogger),
    format: {
      printf: vi.fn((fn) => fn), combine: vi.fn(() => ({})), timestamp: vi.fn(mocks.formatFn),
      errors: vi.fn(mocks.formatFn), json: vi.fn(mocks.formatFn), colorize: vi.fn(mocks.formatFn),
    },
    transports: { Console: vi.fn(function Console(this: any, opts: any) { this.opts = opts; }) },
  },
}));
vi.mock("winston-daily-rotate-file", () => ({ default: vi.fn(function DailyRotateFile(this: any, opts: any) { this.opts = opts; }) }));

describe("logger helpers", () => {
  it("log through the underlying winston logger", async () => {
    const mod = await import("./logger");
    mod.logStartup(5000, "test");
    mod.logRequest("GET", "/api/health", 12, 200);
    mod.logRequest("GET", "/missing", 1, 404);
    mod.logRequest("GET", "/oops", 1, 500);
    mod.logJobCreated("j1", "merge-pdf", 2, { a: true });
    mod.logJobProgress("j1", "merge-pdf", 50, "middle");
    mod.logJobCompleted("j1", "merge-pdf", 1.234, 2048);
    mod.logJobCompleted("j2", "merge-pdf", 1);
    mod.logJobFailed("j1", "merge-pdf", "boom", "stack".repeat(200));
    mod.logToolExecution("merge-pdf", "j1", ["/a/b.pdf"], { x: 1 });
    mod.logFileOperation("cleanup", "/a/b.pdf", true, "ok");
    mod.logFileOperation("cleanup", "/a/b.pdf", false, "bad");
    mod.logDatabaseOperation("select", "jobs", true, 4);
    mod.logDatabaseOperation("insert", "jobs", false);
    mod.logHealthCheck("healthy", { ok: true });
    mod.logHealthCheck("unhealthy", { ok: false });
    mod.logCleanup(2, 1024 * 1024);

    mod.logger.info("direct");
    mod.logger.warn("direct");
    mod.logger.error("direct");
    mod.logger.debug("direct");

    expect(mocks.mockLogger.info).toHaveBeenCalled();
    expect(mocks.mockLogger.debug).toHaveBeenCalled();
    expect(mocks.mockLogger.warn).toHaveBeenCalled();
    expect(mocks.mockLogger.error).toHaveBeenCalled();
    expect(mocks.mockLogger.log).toHaveBeenCalledWith("info", expect.any(String), expect.any(Object));
    expect(mocks.mockLogger.add).toHaveBeenCalled();
  });
});

describe("redactOptions", () => {
  it("masks password-like keys and preserves the rest", async () => {
    const { redactOptions } = await import("./logger");
    expect(redactOptions({ password: "hunter2", quality: 80 })).toEqual({
      password: "[REDACTED]",
      quality: 80,
    });
    expect(redactOptions({ passphrase: "x", secret: "y", token: "z", keep: 1 })).toEqual({
      passphrase: "[REDACTED]",
      secret: "[REDACTED]",
      token: "[REDACTED]",
      keep: 1,
    });
  });

  it("does not touch empty/absent secrets or non-object input", async () => {
    const { redactOptions } = await import("./logger");
    expect(redactOptions({ password: "" })).toEqual({ password: "" });
    expect(redactOptions({ a: 1 })).toEqual({ a: 1 });
    expect(redactOptions(null as any)).toBeNull();
    expect(redactOptions("nope" as any)).toBe("nope");
  });

  it("returns a copy without mutating the original", async () => {
    const { redactOptions } = await import("./logger");
    const original = { password: "hunter2", n: 1 };
    const out = redactOptions(original);
    expect(original.password).toBe("hunter2");
    expect(out).not.toBe(original);
  });
});

describe("secret redaction in log helpers", () => {
  it("logJobCreated and logToolExecution never emit raw passwords", async () => {
    const mod = await import("./logger");
    mocks.mockLogger.info.mockClear();

    mod.logJobCreated("j1", "protect-pdf", 1, { password: "SUPER_SECRET_PW" });
    mod.logToolExecution("protect-pdf", "j1", ["/a/b.pdf"], { password: "SUPER_SECRET_PW" });

    const emitted = JSON.stringify(mocks.mockLogger.info.mock.calls);
    expect(emitted).not.toContain("SUPER_SECRET_PW");
    expect(emitted).toContain("[REDACTED]");
  });
});
