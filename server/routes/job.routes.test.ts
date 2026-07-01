import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fsSync from "node:fs";

const mocks = vi.hoisted(() => {
  let seq = 0;
  const jobs = new Map<string, any>();
  const storage = {
    createJob: vi.fn(async (data: any) => {
      const job = { id: `job-${++seq}`, ...data, createdAt: new Date() };
      jobs.set(job.id, job);
      return job;
    }),
    getJob: vi.fn(async (id: string) => jobs.get(id)),
    updateJobStatus: vi.fn(async (id: string, status: string, progress?: number) => {
      Object.assign(jobs.get(id) || {}, { status, ...(progress === undefined ? {} : { progress }) });
    }),
    updateJobOutput: vi.fn(async (id: string, outputFile: string) => {
      Object.assign(jobs.get(id) || {}, { outputFile, status: "completed", progress: 100 });
    }),
    updateJobError: vi.fn(async (id: string, error: string) => {
      Object.assign(jobs.get(id) || {}, { error, status: "failed" });
    }),
    getRecentJobs: vi.fn(async () => Array.from(jobs.values())),
    deleteJob: vi.fn(async (id: string) => { jobs.delete(id); }),
    createFeedback: vi.fn(),
    getAllFeedback: vi.fn(),
  };
  const pdfService = {
    mergePDFs: vi.fn(async () => {}), extractPages: vi.fn(async () => {}), splitPDF: vi.fn(async () => ["generated/a.pdf", "generated/b.pdf"]),
    removePages: vi.fn(async () => {}), organizePDF: vi.fn(async () => {}), compressPDF: vi.fn(async () => {}), imagesToPDF: vi.fn(async () => {}),
    pdfToImages: vi.fn(async () => ["generated/page-1.jpg"]), protectPDF: vi.fn(async () => {}), unlockPDF: vi.fn(async () => {}),
    rotatePages: vi.fn(async () => {}), rotatePDF: vi.fn(async () => {}), addPageNumbers: vi.fn(async () => {}), addWatermark: vi.fn(async () => {}),
    editPDF: vi.fn(async () => {}), signPDF: vi.fn(async () => {}), repairPDF: vi.fn(async () => {}), convertToPDFA: vi.fn(async () => {}),
    pdfToText: vi.fn(async () => {}), extractImages: vi.fn(async () => ["generated/image.png"]), isPDFEncrypted: vi.fn(), getPDFPreview: vi.fn(),
  };
  const imageService = {
    compressImage: vi.fn(async () => {}), resizeImage: vi.fn(async () => {}), cropImage: vi.fn(async () => {}), rotateImage: vi.fn(async () => {}), convertImageFormat: vi.fn(async () => {}),
  };
  const officeService = {
    convertToPDF: vi.fn(async () => {}), pdfToWord: vi.fn(async () => {}), pdfToPowerPoint: vi.fn(async () => {}), pdfToExcel: vi.fn(async () => {}),
    htmlToPDF: vi.fn(async () => {}), createWordDocument: vi.fn(async () => {}), createExcelDocument: vi.fn(async () => {}), createPowerPointDocument: vi.fn(async () => {}),
    extractTextFromHtml: vi.fn((html: string) => html.replace(/<[^>]+>/g, "")),
  };
  const fsPromises = {
    mkdir: vi.fn(async () => {}), unlink: vi.fn(async () => {}), stat: vi.fn(async () => ({ size: 4096 })),
    readFile: vi.fn(async () => Buffer.from("file")), writeFile: vi.fn(async () => {}),
  };
  return { jobs, storage, pdfService, imageService, officeService, fsPromises, resetSeq: () => { seq = 0; } };
});

vi.mock("../storage", () => ({ storage: mocks.storage }));
vi.mock("../services/pdf.service", () => ({ pdfService: mocks.pdfService }));
vi.mock("../services/image.service", () => ({ imageService: mocks.imageService }));
vi.mock("../services/office.service", () => ({ officeService: mocks.officeService }));
vi.mock("fs/promises", () => ({ default: mocks.fsPromises, ...mocks.fsPromises }));
vi.mock("pdf-lib", () => ({ PDFDocument: { load: vi.fn(async () => ({ getPageCount: () => 5 })) } }));
vi.mock("../middleware/security", () => ({
  rateLimit: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  cors: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));
vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn(), log: vi.fn() },
  logJobCreated: vi.fn(), logJobCompleted: vi.fn(), logJobFailed: vi.fn(), logToolExecution: vi.fn(), logJobProgress: vi.fn(), logFileOperation: vi.fn(),
  // Use the REAL redaction logic so the route's secret-redaction path is exercised.
  redactOptions: (options: any) => {
    if (!options || typeof options !== "object") return options;
    const SENSITIVE = /pass(word|phrase)?|secret|token/i;
    const clone: any = Array.isArray(options) ? [...options] : { ...options };
    for (const key of Object.keys(clone)) {
      if (SENSITIVE.test(key) && clone[key] != null && clone[key] !== "") clone[key] = "[REDACTED]";
    }
    return clone;
  },
}));

function makeApp() {
  const app = express();
  app.response.download = function (this: any, filePath: string, fileName: string) {
    return this.status(200).json({ filePath, fileName });
  } as any;
  app.use("/jobs", router);
  return app;
}

async function postJob(app: express.Express, toolId: string, options: any = {}, withFile = true) {
  let req = request(app).post("/jobs").field("toolId", toolId).field("options", JSON.stringify(options));
  if (withFile) req = req.attach("files", Buffer.from("pdf"), { filename: "input.pdf", contentType: "application/pdf" });
  return req;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 15));
}

let router: any;

describe("job routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.jobs.clear();
    mocks.resetSeq();
    fsSync.rmSync("uploads", { recursive: true, force: true });
    fsSync.mkdirSync("uploads", { recursive: true });
    router = (await import("./job.routes")).default;
  });

  afterEach(() => {
    fsSync.rmSync("uploads", { recursive: true, force: true });
  });

  it("validates uploads, parses options, creates jobs, and exposes create limiter", async () => {
    const app = makeApp();
    await expect(request(app).post("/jobs").field("toolId", "merge-pdf")).resolves.toMatchObject({ status: 400 });

    const created = await postJob(app, "html-to-pdf", { htmlContent: "<b>hi</b>" }, false);
    expect(created.status).toBe(200);
    expect(created.body.jobId).toBe("job-1");
    expect(mocks.storage.createJob).toHaveBeenCalledWith(expect.objectContaining({ toolId: "html-to-pdf", options: { htmlContent: "<b>hi</b>" } }));
    const security = await import("../middleware/security");
    expect(security.rateLimit).toHaveBeenCalledWith(expect.objectContaining({ windowMs: 900000 }));

    const badJson = await request(app).post("/jobs").field("toolId", "html-to-pdf").field("options", "{");
    expect(badJson.status).toBe(500);
  });

  it("gets, downloads, and deletes jobs", async () => {
    const app = makeApp();
    const job = { id: "job-x", status: "completed", outputFile: "output_files/out.pdf", inputFiles: [{ path: "uploads/in.pdf" }] };
    mocks.jobs.set(job.id, job);

    expect((await request(app).get("/jobs/missing")).status).toBe(404);
    expect((await request(app).get("/jobs/job-x")).body).toMatchObject({ id: "job-x" });
    expect((await request(app).get("/jobs/missing/download")).status).toBe(404);
    mocks.jobs.set("job-p", { id: "job-p", status: "processing" });
    expect((await request(app).get("/jobs/job-p/download")).status).toBe(400);
    expect((await request(app).get("/jobs/job-x/download")).body).toEqual({ filePath: "output_files/out.pdf", fileName: "out.pdf" });

    const deleted = await request(app).delete("/jobs/job-x");
    expect(deleted.body).toEqual({ success: true });
    expect(mocks.fsPromises.unlink).toHaveBeenCalledWith("output_files/out.pdf");
    expect(mocks.fsPromises.unlink).toHaveBeenCalledWith("uploads/in.pdf");
    expect(mocks.storage.deleteJob).toHaveBeenCalledWith("job-x");
  });

  it("processes PDF, image, and office tool switch branches", async () => {
    const app = makeApp();
    const cases: Array<[string, any, boolean]> = [
      ["merge-pdf", { pageOrder: [1] }, true], ["split-pdf", { mode: "extract", pagesToExtract: [1] }, true],
      ["split-pdf", { mode: "fixed", splitEvery: 2 }, true], ["split-pdf", { ranges: "1-2, 4, nope" }, true],
      ["split-pdf", {}, true], ["remove-pages", { pagesToRemove: [2] }, true], ["extract-pages", { pagesToExtract: [1] }, true],
      ["organize-pdf", { pageOrder: [2, 1], rotations: { 1: 90 } }, true], ["compress-pdf", { quality: "low" }, true],
      ["jpg-to-pdf", {}, true], ["scan-pdf", {}, true], ["pdf-to-jpg", {}, true], ["protect-pdf", { password: "secret" }, true],
      ["unlock-pdf", { password: "secret" }, true], ["rotate-pdf", { rotations: { 1: 180 } }, true], ["rotate-pdf", { angle: 90 }, true],
      ["add-page-numbers", { position: "top-left", isBold: true }, true], ["add-watermark", { watermarkText: "DRAFT", orientation: 0 }, true],
      ["edit-pdf", { annotations: [{ text: "a" }] }, true], ["sign-pdf", { signatureText: "me" }, true], ["repair-pdf", {}, true],
      ["pdf-to-pdfa", {}, true], ["pdf-to-text", {}, true], ["extract-images", {}, true], ["compress-image", { quality: 75 }, true],
      ["resize-image", { width: 10, height: 10, maintainAspectRatio: false }, true], ["crop-image", { left: 1, top: 2, width: 3, height: 4 }, true],
      ["rotate-image", { angle: 270 }, true], ["convert-image", { format: "png" }, true], ["word-to-pdf", {}, true],
      ["powerpoint-to-pdf", {}, true], ["excel-to-pdf", {}, true], ["pdf-to-word", {}, true], ["pdf-to-powerpoint", {}, true],
      ["pdf-to-excel", {}, true], ["html-to-pdf", { htmlContent: "<p>html</p>" }, false], ["create-document", { content: "<p>doc</p>" }, false],
      ["create-word", { wordContent: "<b>word</b>" }, false], ["create-excel", { excelData: { headers: ["a"], rows: [[1]] } }, false],
      ["create-powerpoint", { slides: [{ title: "t", content: "c" }] }, false],
    ];

    for (const [toolId, options, withFile] of cases) {
      const res = await postJob(app, toolId, options, withFile);
      expect(res.status, toolId).toBe(200);
    }
    await flush();

    expect(mocks.pdfService.mergePDFs).toHaveBeenCalled();
    expect(mocks.pdfService.extractPages).toHaveBeenCalled();
    expect(mocks.pdfService.splitPDF).toHaveBeenCalledWith(expect.any(String), [{ start: 1, end: 2 }, { start: 4, end: 4 }], "output_files");
    expect(mocks.pdfService.rotatePages).toHaveBeenCalled();
    expect(mocks.pdfService.rotatePDF).toHaveBeenCalled();
    expect(mocks.imageService.convertImageFormat).toHaveBeenCalled();
    expect(mocks.officeService.createPowerPointDocument).toHaveBeenCalled();
    expect(mocks.storage.updateJobOutput).toHaveBeenCalled();
    expect(mocks.fsPromises.writeFile).toHaveBeenCalled();
  });

  it("records processing failures for missing password and unknown tools", async () => {
    const app = makeApp();
    expect((await postJob(app, "protect-pdf", {}, true)).status).toBe(200);
    expect((await postJob(app, "unknown-tool", {}, true)).status).toBe(200);
    await flush();
    expect(mocks.storage.updateJobError).toHaveBeenCalledWith(expect.any(String), "A password is required to protect this PDF.");
    expect(mocks.storage.updateJobError).toHaveBeenCalledWith(expect.any(String), "Unknown tool: unknown-tool");
  });

  it("redacts secrets in the persisted job while processing with the real password", async () => {
    const app = makeApp();
    const res = await postJob(app, "protect-pdf", { password: "SUPER_SECRET_PW" }, true);
    expect(res.status).toBe(200);
    await flush();

    // The job persisted to the DB (and thus returned by GET /api/jobs/:id) must be redacted.
    expect(mocks.storage.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ toolId: "protect-pdf", options: { password: "[REDACTED]" } }),
    );
    const storedOptions = mocks.storage.createJob.mock.calls[0][0].options;
    expect(JSON.stringify(storedOptions)).not.toContain("SUPER_SECRET_PW");

    // But the actual processing must receive the REAL password (in-memory options).
    expect(mocks.pdfService.protectPDF).toHaveBeenCalledWith(
      expect.any(String), expect.any(String), "SUPER_SECRET_PW",
    );
  });
});
