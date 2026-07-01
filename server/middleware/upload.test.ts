import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import { validateUploadedFiles, UPLOAD_DEST } from "./upload";

const PDF = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const SCRIPT = Buffer.from("#!/bin/sh\nrm -rf /\n", "latin1");

const created: string[] = [];

// validateUploadedFiles confines access to UPLOAD_DEST, so fixtures must live
// there (mirroring how multer writes real uploads).
async function makeFile(data: Buffer): Promise<Express.Multer.File> {
  const name = `${randomUUID()}`;
  const p = path.join(UPLOAD_DEST, name);
  await fs.writeFile(p, data);
  created.push(p);
  return { path: p, originalname: `${name}.bin` } as Express.Multer.File;
}

describe("validateUploadedFiles", () => {
  beforeEach(async () => {
    await fs.mkdir(UPLOAD_DEST, { recursive: true });
  });
  afterEach(async () => {
    await Promise.all(created.splice(0).map((p) => fs.unlink(p).catch(() => {})));
  });

  it("accepts files with allowed signatures (PDF, PNG, ZIP/OOXML)", async () => {
    const files = [await makeFile(PDF), await makeFile(PNG), await makeFile(ZIP)];
    await expect(validateUploadedFiles(files)).resolves.toBeUndefined();
  });

  it("is a no-op for empty/undefined input", async () => {
    await expect(validateUploadedFiles(undefined)).resolves.toBeUndefined();
    await expect(validateUploadedFiles([])).resolves.toBeUndefined();
  });

  it("rejects and removes all files when any has a disallowed signature", async () => {
    const good = await makeFile(PDF);
    const bad = await makeFile(SCRIPT);
    await expect(validateUploadedFiles([good, bad])).rejects.toThrow(/not an accepted/);
    // Both uploads are purged from disk on rejection.
    await expect(fs.access(good.path)).rejects.toBeTruthy();
    await expect(fs.access(bad.path)).rejects.toBeTruthy();
  });
});
