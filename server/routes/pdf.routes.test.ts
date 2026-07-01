import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import fsSync from "node:fs";

const mocks = vi.hoisted(() => ({
  pdfService: {
    isPDFEncrypted: vi.fn(async () => true),
    getPDFPreview: vi.fn(async () => ({ pageCount: 2, width: 612, height: 792 })),
  },
  unlink: vi.fn(async () => {}),
}));

vi.mock("../services/pdf.service", () => ({ pdfService: mocks.pdfService }));
vi.mock("fs/promises", () => ({ default: { unlink: mocks.unlink }, unlink: mocks.unlink }));

function appWith(router: any) {
  const app = express();
  app.use("/api", router);
  return app;
}

describe("pdf routes", () => {
  let router: any;
  beforeEach(async () => {
    vi.clearAllMocks();
    fsSync.mkdirSync("uploads", { recursive: true });
    router = (await import("./pdf.routes")).default;
  });

  it("checks encryption and cleans up uploads", async () => {
    const app = appWith(router);
    expect((await request(app).post("/api/check-pdf-encrypted")).status).toBe(400);
    const res = await request(app).post("/api/check-pdf-encrypted").attach("file", Buffer.from("pdf"), "a.pdf");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isEncrypted: true });
    expect(mocks.pdfService.isPDFEncrypted).toHaveBeenCalled();
    expect(mocks.unlink).toHaveBeenCalled();
  });

  it("returns previews and service errors", async () => {
    const app = appWith(router);
    expect((await request(app).post("/api/pdf-preview")).status).toBe(400);
    const ok = await request(app).post("/api/pdf-preview").attach("file", Buffer.from("pdf"), "a.pdf");
    expect(ok.body).toMatchObject({ pageCount: 2 });

    mocks.pdfService.getPDFPreview.mockRejectedValueOnce(new Error("bad pdf"));
    const fail = await request(app).post("/api/pdf-preview").attach("file", Buffer.from("pdf"), "a.pdf");
    expect(fail.status).toBe(500);
    expect(fail.body.error).toBe("bad pdf");
  });
});
