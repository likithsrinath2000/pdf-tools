import { Router } from "express";
import fs from "fs/promises";
import { pdfService } from "../services/pdf.service";
import { createUpload, runUpload, validateUploadedFiles } from "../middleware/upload";
import { rateLimit } from "../middleware/security";
import { sanitizeErrorMessage } from "../utils/sanitize";
import { positiveIntEnv } from "../utils/env";

const router = Router();
const upload = createUpload();

// Per-IP rate limit for these file-inspection endpoints (each reads an upload
// from disk). Complements the global /api limiter and keeps a single client
// from hammering the preview/encryption checks.
const inspectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: positiveIntEnv(process.env.PDF_INSPECT_RATE_LIMIT_MAX, 120),
  message: "Too many requests, please slow down and try again shortly.",
});

/**
 * @route POST /api/check-pdf-encrypted
 * @description Checks if a PDF file is password-protected/encrypted
 * @param {File} file - The PDF file to check
 * @returns {Object} { isEncrypted: boolean } - Whether the PDF is encrypted
 */
router.post("/check-pdf-encrypted", inspectLimiter, runUpload(upload.single('file')), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      await validateUploadedFiles([file]);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message });
    }

    const isEncrypted = await pdfService.isPDFEncrypted(file.path);
    
    await fs.unlink(file.path).catch(() => {});
    
    res.json({ isEncrypted });
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error.message) || "Failed to check PDF" });
  }
});

/**
 * @route POST /api/pdf-preview
 * @description Generates a preview of the PDF including page count and dimensions
 * @param {File} file - The PDF file to preview
 * @returns {Object} Preview data including pageCount, width, height, and optional previewImage
 */
router.post("/pdf-preview", inspectLimiter, runUpload(upload.single('file')), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      await validateUploadedFiles([file]);
    } catch (validationError: any) {
      return res.status(400).json({ error: validationError.message });
    }

    const previewData = await pdfService.getPDFPreview(file.path);
    
    await fs.unlink(file.path).catch(() => {});
    
    res.json(previewData);
  } catch (error: any) {
    res.status(500).json({ error: sanitizeErrorMessage(error.message) || "Failed to generate preview" });
  }
});

export default router;
