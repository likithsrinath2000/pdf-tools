import multer from "multer";
import fs from "fs/promises";
import type { FileHandle } from "fs/promises";
import type { Request, RequestHandler } from "express";

/**
 * Client-declared MIME types we accept at the multer gate. This is only a cheap
 * first filter — `file.mimetype` is supplied by the client and therefore
 * spoofable, so `validateUploadedFiles` re-checks the real file signature
 * (magic bytes) after the upload lands on disk.
 */
const ALLOWED_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Browsers frequently fall back to this generic type; the magic-byte check
  // below is the authoritative gate for these.
  "application/octet-stream",
]);

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
}

/**
 * Shared multer factory. All upload endpoints go through this so the size limit
 * and MIME allowlist stay consistent.
 */
export function createUpload(): multer.Multer {
  return multer({
    dest: "uploads/",
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter,
  });
}

/**
 * Wraps a multer middleware so upload rejections (oversized files, disallowed
 * MIME types) become clean 400 responses instead of falling through to the
 * generic 500 error handler.
 */
export function runUpload(uploadMiddleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Invalid upload." });
      }
      next();
    });
  };
}

/** Returns true when `buf` begins with the given byte signature. */
function startsWith(buf: Buffer, signature: number[]): boolean {
  if (buf.length < signature.length) return false;
  return signature.every((byte, i) => buf[i] === byte);
}

/**
 * Inspects the leading bytes of a file and returns true when they match one of
 * the allowed formats (PDF, common raster images, or Office documents). This is
 * the authoritative content-type check — it cannot be fooled by a spoofed
 * Content-Type header or file extension.
 */
async function hasAllowedSignature(filePath: string): Promise<boolean> {
  let handle: FileHandle | undefined;
  try {
    handle = await fs.open(filePath, "r");
    const buf = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buf, 0, 16, 0);
    const head = buf.subarray(0, bytesRead);

    // PDF: "%PDF"
    if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return true;
    // JPEG
    if (startsWith(head, [0xff, 0xd8, 0xff])) return true;
    // PNG
    if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
    // GIF ("GIF8")
    if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return true;
    // BMP
    if (startsWith(head, [0x42, 0x4d])) return true;
    // TIFF (little- and big-endian)
    if (startsWith(head, [0x49, 0x49, 0x2a, 0x00])) return true;
    if (startsWith(head, [0x4d, 0x4d, 0x00, 0x2a])) return true;
    // WEBP: "RIFF"…"WEBP"
    if (
      startsWith(head, [0x52, 0x49, 0x46, 0x46]) &&
      head.length >= 12 &&
      head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
    ) {
      return true;
    }
    // ZIP-based OOXML (docx/xlsx/pptx): "PK\x03\x04" / "PK\x05\x06" / "PK\x07\x08"
    if (
      startsWith(head, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWith(head, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWith(head, [0x50, 0x4b, 0x07, 0x08])
    ) {
      return true;
    }
    // Legacy OLE compound (doc/xls/ppt)
    if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return true;

    return false;
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => {});
  }
}

/**
 * Verifies every uploaded file has an allowed content signature. On any
 * mismatch it removes all uploaded files (so nothing untrusted is left on disk)
 * and throws — callers should translate this into a 400 response.
 */
export async function validateUploadedFiles(
  files: Express.Multer.File[] | undefined
): Promise<void> {
  if (!files || files.length === 0) return;

  for (const file of files) {
    const ok = await hasAllowedSignature(file.path);
    if (!ok) {
      await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
      throw new Error(
        `File "${file.originalname}" is not an accepted document or image type.`
      );
    }
  }
}
