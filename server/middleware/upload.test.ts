import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { validateUploadedFiles } from "./upload";

const PDF = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const SCRIPT = Buffer.from("#!/bin/sh\nrm -rf /\n", "latin1");

let dir: string;

async function makeFile(name: string, data: Buffer): Promise<Express.Multer.File> {
  const p = path.join(dir, name);
  await fs.writeFile(p, data);
  return { path: p, originalname: name } as Express.Multer.File;
}

describe("validateUploadedFiles", () => {
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-test-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("accepts files with allowed signatures (PDF, PNG, ZIP/OOXML)", async () => {
    const files = [
      await makeFile("a.pdf", PDF),
      await makeFile("b.png", PNG),
      await makeFile("c.docx", ZIP),
    ];
    await expect(validateUploadedFiles(files)).resolves.toBeUndefined();
  });

  it("is a no-op for empty/undefined input", async () => {
    await expect(validateUploadedFiles(undefined)).resolves.toBeUndefined();
    await expect(validateUploadedFiles([])).resolves.toBeUndefined();
  });

  it("rejects and removes all files when any has a disallowed signature", async () => {
    const good = await makeFile("good.pdf", PDF);
    const bad = await makeFile("evil.pdf", SCRIPT);
    await expect(validateUploadedFiles([good, bad])).rejects.toThrow(/not an accepted/);
    // Both uploads are purged from disk on rejection.
    await expect(fs.access(good.path)).rejects.toBeTruthy();
    await expect(fs.access(bad.path)).rejects.toBeTruthy();
  });
});
