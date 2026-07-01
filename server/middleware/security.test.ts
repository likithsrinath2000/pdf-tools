import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { rateLimit, cors } from "./security";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: "1.2.3.4",
    method: "GET",
    headers: {},
    socket: { remoteAddress: "1.2.3.4" } as any,
    ...overrides,
  } as Request;
}

function mockRes(): Response & { _status: number; _json: any; _headers: Record<string, string>; _sent?: number } {
  const res: any = {
    _status: 200,
    _json: undefined,
    _headers: {},
    setHeader(name: string, value: string) {
      this._headers[name.toLowerCase()] = String(value);
    },
    getHeader(name: string) {
      return this._headers[name.toLowerCase()];
    },
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: any) {
      this._json = body;
      return this;
    },
    sendStatus(code: number) {
      this._sent = code;
      this._status = code;
      return this;
    },
  };
  return res;
}

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the max and decrements RateLimit-Remaining", () => {
    const mw = rateLimit({ windowMs: 1000, max: 3 });
    const next = vi.fn();

    const remainingSeen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      mw(mockReq(), res, next);
      expect(res._status).toBe(200);
      expect(res._headers["ratelimit-limit"]).toBe("3");
      remainingSeen.push(res._headers["ratelimit-remaining"]);
    }
    expect(next).toHaveBeenCalledTimes(3);
    // Same limiter instance + same IP => remaining decrements 2,1,0
    expect(remainingSeen).toEqual(["2", "1", "0"]);
  });

  it("returns 429 with Retry-After once the max is exceeded", () => {
    const mw = rateLimit({ windowMs: 1000, max: 2 });
    const next = vi.fn();

    mw(mockReq(), mockRes(), next);
    mw(mockReq(), mockRes(), next);
    const res = mockRes();
    mw(mockReq(), res, next);

    expect(res._status).toBe(429);
    expect(res._json).toEqual({ error: expect.any(String) });
    expect(res._headers["retry-after"]).toBeDefined();
    expect(next).toHaveBeenCalledTimes(2); // third was blocked
  });

  it("uses a custom message when provided", () => {
    const mw = rateLimit({ windowMs: 1000, max: 1, message: "slow down" });
    const next = vi.fn();
    mw(mockReq(), mockRes(), next);
    const res = mockRes();
    mw(mockReq(), res, next);
    expect(res._json).toEqual({ error: "slow down" });
  });

  it("resets the counter after the window elapses", () => {
    const mw = rateLimit({ windowMs: 1000, max: 1 });
    const next = vi.fn();

    mw(mockReq(), mockRes(), next);
    const blocked = mockRes();
    mw(mockReq(), blocked, next);
    expect(blocked._status).toBe(429);

    vi.advanceTimersByTime(1001);

    const after = mockRes();
    mw(mockReq(), after, next);
    expect(after._status).toBe(200);
  });

  it("tracks separate IPs independently", () => {
    const mw = rateLimit({ windowMs: 1000, max: 1 });
    const next = vi.fn();

    const a = mockRes();
    mw(mockReq({ ip: "10.0.0.1" }), a, next);
    const b = mockRes();
    mw(mockReq({ ip: "10.0.0.2" }), b, next);

    expect(a._status).toBe(200);
    expect(b._status).toBe(200);
  });

  it("falls back to socket.remoteAddress when ip is missing", () => {
    const mw = rateLimit({ windowMs: 1000, max: 1 });
    const next = vi.fn();
    const req = mockReq({ ip: undefined });
    const res = mockRes();
    mw(req, res, next);
    expect(res._status).toBe(200);
    expect(next).toHaveBeenCalled();
  });
});

describe("cors", () => {
  const OLD_ENV = process.env.ALLOWED_ORIGINS;
  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = OLD_ENV;
  });

  it("reflects any origin when no allowlist is configured", () => {
    delete process.env.ALLOWED_ORIGINS;
    const mw = cors();
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq({ headers: { origin: "https://evil.example" } }), res, next);
    expect(res._headers["access-control-allow-origin"]).toBe("https://evil.example");
    expect(res._headers["vary"]).toBe("Origin");
    expect(next).toHaveBeenCalled();
  });

  it("sets wildcard when allowAll and no Origin header is present", () => {
    delete process.env.ALLOWED_ORIGINS;
    const mw = cors();
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq({ headers: {} }), res, next);
    expect(res._headers["access-control-allow-origin"]).toBe("*");
  });

  it("only reflects allowlisted origins when ALLOWED_ORIGINS is set", () => {
    process.env.ALLOWED_ORIGINS = "https://good.example, https://also-good.example";
    const mw = cors();
    const next = vi.fn();

    const allowed = mockRes();
    mw(mockReq({ headers: { origin: "https://good.example" } }), allowed, next);
    expect(allowed._headers["access-control-allow-origin"]).toBe("https://good.example");

    const denied = mockRes();
    mw(mockReq({ headers: { origin: "https://evil.example" } }), denied, next);
    expect(denied._headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("never sets Access-Control-Allow-Credentials (no cookie exposure)", () => {
    delete process.env.ALLOWED_ORIGINS;
    const mw = cors();
    const res = mockRes();
    mw(mockReq({ headers: { origin: "https://x.example" } }), res, vi.fn());
    expect(res._headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("short-circuits OPTIONS preflight with 204", () => {
    const mw = cors();
    const next = vi.fn();
    const res = mockRes();
    mw(mockReq({ method: "OPTIONS", headers: { origin: "https://x.example" } }), res, next);
    expect(res._sent).toBe(204);
    expect(next).not.toHaveBeenCalled();
  });

  it("advertises allowed methods and headers", () => {
    const mw = cors();
    const res = mockRes();
    mw(mockReq({ headers: { origin: "https://x.example" } }), res, vi.fn());
    expect(res._headers["access-control-allow-methods"]).toContain("POST");
    expect(res._headers["access-control-allow-headers"]).toContain("Content-Type");
    expect(res._headers["access-control-max-age"]).toBe("86400");
  });
});
