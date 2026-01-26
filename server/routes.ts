import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { pdfService } from "./services/pdf.service";
import { imageService } from "./services/image.service";
import { officeService } from "./services/office.service";
import { randomUUID } from "crypto";
import { logger, logJobCreated, logJobCompleted, logJobFailed, logRequest, logToolExecution, logJobProgress, logFileOperation } from "./logger";
import { register, httpRequestDuration, jobsProcessed, activeJobs, fileSizeProcessed } from "./metrics";

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024,
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      logRequest(req.method, req.path, duration, res.statusCode);
      httpRequestDuration.observe(
        { method: req.method, route: req.path, status_code: res.statusCode.toString() },
        duration
      );
    });
    next();
  });

  app.get("/api/health", async (req, res) => {
    try {
      const dbCheck = await storage.getRecentJobs(1);
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: "connected",
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({ 
        status: "error", 
        timestamp: new Date().toISOString(),
        database: "disconnected"
      });
    }
  });

  app.get("/api/metrics", async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  app.post("/api/check-pdf-encrypted", upload.single('file'), async (req, res) => {
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

  app.post("/api/pdf-preview", upload.single('file'), async (req, res) => {
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

  app.post("/api/jobs", upload.array('files', 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { toolId, options } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const inputFiles = files.map(f => ({
        path: f.path,
        originalName: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
      }));

      const parsedOptions = options ? JSON.parse(options) : {};

      const job = await storage.createJob({
        toolId,
        status: "processing",
        progress: 0,
        inputFiles: inputFiles as any,
        options: parsedOptions as any,
      });

      logJobCreated(job.id, toolId, files.length, parsedOptions);
      activeJobs.inc();
      
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      fileSizeProcessed.observe({ tool_id: toolId }, totalSize);
      
      logger.debug(`Job ${job.id} queued with options: ${JSON.stringify(parsedOptions)}`);

      processJobAsync(job.id, toolId, inputFiles, parsedOptions).catch(err => {
        logger.error(`Unhandled error in job ${job.id}:`, err);
      });

      res.json({ jobId: job.id });
    } catch (error: any) {
      console.error("Error creating job:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/jobs/:jobId", async (req, res) => {
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

  app.get("/api/jobs/:jobId/download", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.status !== "completed" || !job.outputFile) {
        return res.status(400).json({ error: "Job not completed or no output file" });
      }

      res.download(job.outputFile, path.basename(job.outputFile));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/jobs/:jobId", async (req, res) => {
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

  return httpServer;
}

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
      case "merge-pdf":
        await pdfService.mergePDFs(inputFiles.map(f => f.path), outputPath);
        break;

      case "split-pdf":
        const ranges = options.ranges || [{ start: 1, end: 2 }];
        const splitFiles = await pdfService.splitPDF(inputFiles[0].path, ranges, outputDir);
        
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < splitFiles.length; i++) {
          const content = await fs.readFile(splitFiles[i]);
          zip.file(`split_${i + 1}.pdf`, content);
        }
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        await fs.writeFile(outputPath.replace(path.extname(outputPath), '.zip'), zipBuffer);
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

      case "protect-pdf":
        await pdfService.protectPDF(inputFiles[0].path, outputPath, options.password || 'password123');
        break;

      case "unlock-pdf":
        await pdfService.unlockPDF(inputFiles[0].path, outputPath, options.password || '');
        break;

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
        await pdfService.addWatermark(inputFiles[0].path, outputPath, options.watermarkText || 'CONFIDENTIAL', options.opacity || 0.3);
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

      default:
        throw new Error(`Unknown tool: ${toolId}`);
    }

    logJobProgress(jobId, toolId, 90, 'finalizing');
    await storage.updateJobStatus(jobId, "processing", 90);

    const actualOutput = toolId === 'split-pdf' || toolId === 'pdf-to-jpg'
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
    "word-to-pdf": ".pdf",
    "powerpoint-to-pdf": ".pdf",
    "excel-to-pdf": ".pdf",
    "html-to-pdf": ".pdf",
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
