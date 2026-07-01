import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { storage } from "../storage";
import { logger, logJobCreated, logJobCompleted, logJobFailed, logToolExecution, logJobProgress, logFileOperation, redactOptions } from "../logger";
import { jobsProcessed, activeJobs, fileSizeProcessed } from "../metrics";
import { randomUUID } from "crypto";
import { pdfService } from "../services/pdf.service";
import { imageService } from "../services/image.service";
import { officeService } from "../services/office.service";
import { rateLimit } from "../middleware/security";

const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024,
  }
});

// Stricter limit for resource-intensive job creation (file processing).
const createJobLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.JOB_RATE_LIMIT_MAX || "60", 10),
  message: "Too many processing requests, please slow down and try again shortly.",
});

/**
 * @route POST /api/jobs
 * @description Creates a new processing job for the specified tool
 * @param {File[]} files - Array of files to process (up to 20)
 * @param {string} toolId - The ID of the tool to use for processing
 * @param {string} options - JSON string of tool-specific options
 * @returns {Object} { jobId: string } - The ID of the created job
 */
router.post("/", createJobLimiter, upload.array('files', 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { toolId, options } = req.body;

    const noFileTools = ["create-document", "html-to-pdf", "create-word", "create-excel", "create-powerpoint"];
    if ((!files || files.length === 0) && !noFileTools.includes(toolId)) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const inputFiles = files ? files.map(f => ({
      path: f.path,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
    })) : [];

    const parsedOptions = options ? JSON.parse(options) : {};

    // Persist a redacted copy so secrets (e.g. passwords) never land in the DB
    // or the job-status API response. Processing below uses the real in-memory
    // parsedOptions, so functionality is unaffected.
    const job = await storage.createJob({
      toolId,
      status: "processing",
      progress: 0,
      inputFiles: inputFiles as any,
      options: redactOptions(parsedOptions) as any,
    });

    logJobCreated(job.id, toolId, files?.length || 0, parsedOptions);
    activeJobs.inc();
    
    const totalSize = files?.reduce((sum, f) => sum + f.size, 0) || 0;
    fileSizeProcessed.observe({ tool_id: toolId }, totalSize);
    
    logger.debug(`Job ${job.id} queued with options: ${JSON.stringify(redactOptions(parsedOptions))}`);

    processJobAsync(job.id, toolId, inputFiles, parsedOptions).catch(err => {
      logger.error(`Unhandled error in job ${job.id}:`, err);
    });

    res.json({ jobId: job.id });
  } catch (error: any) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/jobs/:jobId
 * @description Retrieves the status and details of a specific job
 * @param {string} jobId - The ID of the job to retrieve
 * @returns {Object} The job object with status, progress, and output information
 */
router.get("/:jobId", async (req, res) => {
  try {
    const job = await storage.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/jobs/:jobId/download
 * @description Downloads the output file of a completed job
 * @param {string} jobId - The ID of the job whose output to download
 * @returns {File} The processed output file
 */
router.get("/:jobId/download", async (req, res) => {
  try {
    const job = await storage.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== "completed" || !job.outputFile) {
      return res.status(400).json({ error: "Job not completed or no output file" });
    }

    const outputFile = job.outputFile;
    const inputFiles = (job.inputFiles as any[]) || [];

    // Stream the file, then purge it from the server so a processed document is
    // never retained after the user has received it. Client-side tools never
    // upload their result and can still be re-downloaded from the browser.
    // On a failed/interrupted transfer we keep the file so the user can retry;
    // the periodic cleanup remains a safety net for abandoned downloads.
    res.download(outputFile, path.basename(outputFile), async (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        }
        return;
      }
      try {
        await fs.unlink(outputFile).catch(() => {});
        for (const file of inputFiles) {
          await fs.unlink(file.path).catch(() => {});
        }
        await storage.deleteJob(req.params.jobId);
        logFileOperation('cleanup', outputFile, true, 'deleted after download');
      } catch (cleanupErr: any) {
        logger.error('Post-download cleanup failed:', { jobId: req.params.jobId, error: cleanupErr.message });
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route DELETE /api/jobs/:jobId
 * @description Deletes a job and its associated input/output files
 * @param {string} jobId - The ID of the job to delete
 * @returns {Object} { success: boolean }
 */
router.delete("/:jobId", async (req, res) => {
  try {
    const job = await storage.getJob(req.params.jobId);
    if (job && job.outputFile) {
      await fs.unlink(job.outputFile).catch(() => {});
    }
    
    const files = job?.inputFiles as any[];
    if (files) {
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    await storage.deleteJob(req.params.jobId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Processes a job asynchronously based on the tool type
 * @param jobId - The ID of the job being processed
 * @param toolId - The ID of the tool to use
 * @param inputFiles - Array of input file information
 * @param options - Tool-specific processing options
 */
async function processJobAsync(
  jobId: string,
  toolId: string,
  inputFiles: any[],
  options: any
): Promise<void> {
  const startTime = Date.now();
  try {
    logJobProgress(jobId, toolId, 10, 'starting');
    await storage.updateJobStatus(jobId, "processing", 10);
    
    logToolExecution(toolId, jobId, inputFiles.map(f => f.path), options);

    const outputDir = "output_files";
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputFileName = `${toolId}_${randomUUID()}${getOutputExtension(toolId)}`;
    const outputPath = path.join(outputDir, outputFileName);
    
    logger.debug(`Output will be saved to: ${outputPath}`);

    logJobProgress(jobId, toolId, 30, 'processing');
    await storage.updateJobStatus(jobId, "processing", 30);

    switch (toolId) {
      // PDF Processing Tools
      case "merge-pdf":
        await pdfService.mergePDFs(inputFiles.map(f => f.path), outputPath, options.pageOrder);
        break;

      case "split-pdf":
        if (options.mode === "extract" && options.pagesToExtract?.length > 0) {
          const pdfOutputPath = outputPath.replace('.zip', '.pdf');
          await pdfService.extractPages(inputFiles[0].path, options.pagesToExtract, pdfOutputPath);
          
          await storage.updateJobOutput(jobId, pdfOutputPath);
          logJobProgress(jobId, toolId, 100, 'completed');
          await storage.updateJobStatus(jobId, "completed", 100);
          
          for (const file of inputFiles) {
            await fs.unlink(file.path).catch(() => {});
            logFileOperation('cleanup', file.path, true);
          }
          
          const duration = (Date.now() - startTime) / 1000;
          logJobCompleted(jobId, toolId, duration);
          jobsProcessed.inc({ tool_id: toolId, status: 'completed' });
          activeJobs.dec();
          return;
        } else {
          let ranges: { start: number; end: number }[] = [];
          
          if (options.mode === "fixed" && options.splitEvery) {
            const pdfBytes = await fs.readFile(inputFiles[0].path);
            const { PDFDocument } = await import('pdf-lib');
            const tempPdf = await PDFDocument.load(pdfBytes);
            const totalPages = tempPdf.getPageCount();
            const step = options.splitEvery;
            
            for (let i = 1; i <= totalPages; i += step) {
              ranges.push({ start: i, end: Math.min(i + step - 1, totalPages) });
            }
          } else if (options.ranges) {
            ranges = parseRanges(options.ranges);
          } else {
            ranges = [{ start: 1, end: 2 }];
          }
          
          const splitFiles = await pdfService.splitPDF(inputFiles[0].path, ranges, outputDir);
          
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          for (let i = 0; i < splitFiles.length; i++) {
            const content = await fs.readFile(splitFiles[i]);
            zip.file(`split_${i + 1}.pdf`, content);
          }
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
          await fs.writeFile(outputPath.replace(path.extname(outputPath), '.zip'), zipBuffer);
        }
        break;

      case "remove-pages":
        await pdfService.removePages(inputFiles[0].path, options.pagesToRemove || [], outputPath);
        break;

      case "extract-pages":
        await pdfService.extractPages(inputFiles[0].path, options.pagesToExtract || [], outputPath);
        break;

      case "organize-pdf":
        await pdfService.organizePDF(
          inputFiles[0].path,
          options.pageOrder || [],
          options.rotations || {},
          outputPath
        );
        break;

      case "compress-pdf":
        await pdfService.compressPDF(inputFiles[0].path, outputPath, options.quality || 'medium');
        break;

      case "jpg-to-pdf":
      case "scan-pdf":
        await pdfService.imagesToPDF(inputFiles.map(f => f.path), outputPath);
        break;

      case "pdf-to-jpg":
        const images = await pdfService.pdfToImages(inputFiles[0].path, outputDir, 'jpg');
        const JSZipJpg = (await import('jszip')).default;
        const zipJpg = new JSZipJpg();
        for (let i = 0; i < images.length; i++) {
          const content = await fs.readFile(images[i]);
          zipJpg.file(`page_${i + 1}.jpg`, content);
        }
        const zipJpgBuffer = await zipJpg.generateAsync({ type: 'nodebuffer' });
        await fs.writeFile(outputPath.replace('.pdf', '.zip'), zipJpgBuffer);
        break;

      case "protect-pdf":
        if (!options.password) {
          throw new Error('A password is required to protect this PDF.');
        }
        await pdfService.protectPDF(inputFiles[0].path, outputPath, options.password);
        break;

      case "unlock-pdf":
        await pdfService.unlockPDF(inputFiles[0].path, outputPath, options.password || '');
        break;

      case "rotate-pdf":
        if (options.rotations && Object.keys(options.rotations).length > 0) {
          await pdfService.rotatePages(inputFiles[0].path, outputPath, options.rotations);
        } else {
          await pdfService.rotatePDF(inputFiles[0].path, outputPath, options.angle || 90);
        }
        break;

      case "add-page-numbers":
        await pdfService.addPageNumbers(inputFiles[0].path, outputPath, {
          position: options.position || 'bottom-center',
          startNumber: options.startNumber || 1,
          startPage: options.startPage || 1,
          endPage: options.endPage || null,
          marginX: options.marginX || 40,
          marginY: options.marginY || 30,
          fontSize: options.fontSize || 12,
          font: options.font || 'Helvetica',
          color: options.color || '#000000',
          isBold: options.isBold || false,
          isItalic: options.isItalic || false,
          format: options.format || 'number'
        });
        break;

      case "add-watermark":
        await pdfService.addWatermark(
          inputFiles[0].path, 
          outputPath, 
          options.watermarkText || 'CONFIDENTIAL', 
          options.opacity || 0.3,
          options.orientation ?? -45,
          options.fontFamily || 'helvetica-bold',
          options.fontSize
        );
        break;

      case "edit-pdf":
        await pdfService.editPDF(inputFiles[0].path, outputPath, options.annotations || []);
        break;

      case "sign-pdf":
        await pdfService.signPDF(inputFiles[0].path, outputPath, {
          signatureText: options.signatureText,
          signatureImage: options.signatureImage,
          signatureType: options.signatureType || 'text',
          signatureScale: options.signatureScale || 1,
          position: options.position || { page: 1, x: 100, y: 100 }
        });
        break;

      case "repair-pdf":
        await pdfService.repairPDF(inputFiles[0].path, outputPath);
        break;

      case "pdf-to-pdfa":
        await pdfService.convertToPDFA(inputFiles[0].path, outputPath);
        break;

      case "pdf-to-text":
        await pdfService.pdfToText(inputFiles[0].path, outputPath);
        break;

      case "extract-images":
        const extractedImages = await pdfService.extractImages(inputFiles[0].path, outputDir);
        const JSZipExtract = (await import('jszip')).default;
        const zipExtract = new JSZipExtract();
        for (let i = 0; i < extractedImages.length; i++) {
          const content = await fs.readFile(extractedImages[i]);
          const ext = path.extname(extractedImages[i]);
          zipExtract.file(`image_${i + 1}${ext}`, content);
        }
        const zipExtractBuffer = await zipExtract.generateAsync({ type: 'nodebuffer' });
        await fs.writeFile(outputPath.replace('.pdf', '.zip'), zipExtractBuffer);
        break;

      // Image Processing Tools
      case "compress-image":
        await imageService.compressImage(inputFiles[0].path, outputPath, options.quality || 80);
        break;

      case "resize-image":
        await imageService.resizeImage(
          inputFiles[0].path,
          outputPath,
          options.width,
          options.height,
          options.maintainAspectRatio !== false
        );
        break;

      case "crop-image":
        await imageService.cropImage(
          inputFiles[0].path,
          outputPath,
          options.left || 0,
          options.top || 0,
          options.width || 100,
          options.height || 100
        );
        break;

      case "rotate-image":
        await imageService.rotateImage(inputFiles[0].path, outputPath, options.angle || 90);
        break;

      case "convert-image":
        await imageService.convertImageFormat(inputFiles[0].path, outputPath, options.format || 'jpg');
        break;

      // Office Document Tools
      case "word-to-pdf":
      case "powerpoint-to-pdf":
      case "excel-to-pdf":
        await officeService.convertToPDF(inputFiles[0].path, outputPath);
        break;

      case "pdf-to-word":
        await officeService.pdfToWord(inputFiles[0].path, outputPath);
        break;

      case "pdf-to-powerpoint":
        await officeService.pdfToPowerPoint(inputFiles[0].path, outputPath);
        break;

      case "pdf-to-excel":
        await officeService.pdfToExcel(inputFiles[0].path, outputPath);
        break;

      case "html-to-pdf":
        await officeService.htmlToPDF(options.htmlContent || '', outputPath);
        break;

      case "create-document":
        await officeService.htmlToPDF(options.content || '<p>Empty document</p>', outputPath);
        break;

      case "create-word":
        const wordContent = (officeService as any).extractTextFromHtml(options.wordContent || 'Empty document');
        await officeService.createWordDocument(wordContent, outputPath);
        break;

      case "create-excel":
        await officeService.createExcelDocument(options.excelData || { headers: [], rows: [] }, outputPath);
        break;

      case "create-powerpoint":
        await officeService.createPowerPointDocument(options.slides || [{ title: 'Slide 1', content: 'Content' }], outputPath);
        break;

      default:
        throw new Error(`Unknown tool: ${toolId}`);
    }

    logJobProgress(jobId, toolId, 90, 'finalizing');
    await storage.updateJobStatus(jobId, "processing", 90);

    const actualOutput = toolId === 'split-pdf' || toolId === 'pdf-to-jpg' || toolId === 'extract-images'
      ? outputPath.replace(path.extname(outputPath), '.zip')
      : outputPath;

    await storage.updateJobOutput(jobId, actualOutput);
    
    let outputSize: number | undefined;
    try {
      const stats = await fs.stat(actualOutput);
      outputSize = stats.size;
      logFileOperation('created', actualOutput, true, `${(outputSize / 1024 / 1024).toFixed(2)}MB`);
    } catch {}

    for (const file of inputFiles) {
      await fs.unlink(file.path).catch(() => {});
      logFileOperation('cleanup', file.path, true);
    }

    const duration = (Date.now() - startTime) / 1000;
    logJobCompleted(jobId, toolId, duration, outputSize);
    jobsProcessed.inc({ tool_id: toolId, status: 'completed' });
    activeJobs.dec();
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    logger.error(`Job ${jobId} failed after ${duration.toFixed(2)}s:`, error);
    logJobFailed(jobId, toolId, error.message, error.stack);
    await storage.updateJobError(jobId, error.message);
    
    for (const file of inputFiles) {
      await fs.unlink(file.path).catch(() => {});
    }

    jobsProcessed.inc({ tool_id: toolId, status: 'failed' });
    activeJobs.dec();
  }
}

/**
 * Parses a range string into an array of start/end range objects
 * @param rangeStr - A string like "1-3, 5, 7-10"
 * @returns Array of range objects
 */
function parseRanges(rangeStr: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const parts = rangeStr.split(',').map(p => p.trim()).filter(Boolean);
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        ranges.push({ start, end });
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page)) {
        ranges.push({ start: page, end: page });
      }
    }
  }
  
  return ranges.length > 0 ? ranges : [{ start: 1, end: 2 }];
}

/**
 * Gets the appropriate file extension for a given tool's output
 * @param toolId - The ID of the processing tool
 * @returns The file extension including the dot (e.g., ".pdf")
 */
function getOutputExtension(toolId: string): string {
  const extensionMap: Record<string, string> = {
    "merge-pdf": ".pdf",
    "split-pdf": ".zip",
    "remove-pages": ".pdf",
    "extract-pages": ".pdf",
    "organize-pdf": ".pdf",
    "compress-pdf": ".pdf",
    "jpg-to-pdf": ".pdf",
    "scan-pdf": ".pdf",
    "pdf-to-jpg": ".zip",
    "extract-images": ".zip",
    "word-to-pdf": ".pdf",
    "powerpoint-to-pdf": ".pdf",
    "excel-to-pdf": ".pdf",
    "html-to-pdf": ".pdf",
    "create-document": ".pdf",
    "create-word": ".docx",
    "create-excel": ".xlsx",
    "create-powerpoint": ".pptx",
    "pdf-to-word": ".docx",
    "pdf-to-powerpoint": ".pptx",
    "pdf-to-excel": ".xlsx",
    "protect-pdf": ".pdf",
    "unlock-pdf": ".pdf",
    "compress-image": ".jpg",
    "resize-image": ".jpg",
    "crop-image": ".jpg",
    "rotate-image": ".jpg",
    "rotate-pdf": ".pdf",
    "add-page-numbers": ".pdf",
    "add-watermark": ".pdf",
    "edit-pdf": ".pdf",
    "sign-pdf": ".pdf",
    "repair-pdf": ".pdf",
    "pdf-to-pdfa": ".pdf",
    "pdf-to-text": ".txt",
    "convert-image": ".jpg",
  };
  return extensionMap[toolId] || ".pdf";
}

export default router;
