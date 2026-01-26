import { Router } from "express";
import multer from "multer";
import fs from "fs/promises";
import { pdfService } from "../services/pdf.service";

const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024,
  }
});

/**
 * @route POST /api/check-pdf-encrypted
 * @description Checks if a PDF file is password-protected/encrypted
 * @param {File} file - The PDF file to check
 * @returns {Object} { isEncrypted: boolean } - Whether the PDF is encrypted
 */
router.post("/check-pdf-encrypted", upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const isEncrypted = await pdfService.isPDFEncrypted(file.path);
    
    await fs.unlink(file.path).catch(() => {});
    
    res.json({ isEncrypted });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to check PDF" });
  }
});

/**
 * @route POST /api/pdf-preview
 * @description Generates a preview of the PDF including page count and dimensions
 * @param {File} file - The PDF file to preview
 * @returns {Object} Preview data including pageCount, width, height, and optional previewImage
 */
router.post("/pdf-preview", upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const previewData = await pdfService.getPDFPreview(file.path);
    
    await fs.unlink(file.path).catch(() => {});
    
    res.json(previewData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate preview" });
  }
});

export default router;
