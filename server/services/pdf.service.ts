import { PDFDocument, rgb, degrees } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';

const execPromise = promisify(exec);

export class PDFService {
  async mergePDFs(inputPaths: string[], outputPath: string): Promise<void> {
    const mergedPdf = await PDFDocument.create();
    
    for (const inputPath of inputPaths) {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    await fs.writeFile(outputPath, mergedPdfBytes);
  }

  async splitPDF(inputPath: string, ranges: { start: number; end: number }[], outputDir: string): Promise<string[]> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const outputPaths: string[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const { start, end } = ranges[i];
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdf, Array.from({ length: end - start + 1 }, (_, idx) => start + idx - 1));
      pages.forEach((page) => newPdf.addPage(page));
      
      const outputPath = path.join(outputDir, `split_${i + 1}.pdf`);
      const newPdfBytes = await newPdf.save();
      await fs.writeFile(outputPath, newPdfBytes);
      outputPaths.push(outputPath);
    }

    return outputPaths;
  }

  async removePages(inputPath: string, pagesToRemove: number[], outputPath: string): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();
    
    const allPages = pdf.getPageIndices();
    const pagesToKeep = allPages.filter(idx => !pagesToRemove.includes(idx + 1));
    
    const pages = await newPdf.copyPages(pdf, pagesToKeep);
    pages.forEach((page) => newPdf.addPage(page));
    
    const newPdfBytes = await newPdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async extractPages(inputPath: string, pagesToExtract: number[], outputPath: string): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();
    
    const pageIndices = pagesToExtract.map(p => p - 1);
    const pages = await newPdf.copyPages(pdf, pageIndices);
    pages.forEach((page) => newPdf.addPage(page));
    
    const newPdfBytes = await newPdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async organizePDF(inputPath: string, pageOrder: number[], rotations: Record<number, number>, outputPath: string): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const newPdf = await PDFDocument.create();
    
    const pageIndices = pageOrder.map(p => p - 1);
    const pages = await newPdf.copyPages(pdf, pageIndices);
    
    pages.forEach((page, idx) => {
      const rotation = rotations[pageOrder[idx]] || 0;
      if (rotation !== 0) {
        page.setRotation(degrees(rotation));
      }
      newPdf.addPage(page);
    });
    
    const newPdfBytes = await newPdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async compressPDF(inputPath: string, outputPath: string, quality: 'low' | 'medium' | 'high'): Promise<void> {
    const qualitySettings = {
      low: '/screen',
      medium: '/ebook',
      high: '/printer'
    };
    
    const setting = qualitySettings[quality];
    
    try {
      await execPromise(
        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${setting} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`
      );
    } catch (error) {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const newPdfBytes = await pdf.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, newPdfBytes);
    }
  }

  async imagesToPDF(imagePaths: string[], outputPath: string): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    
    for (const imagePath of imagePaths) {
      const imageBuffer = await fs.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      
      let image;
      if (ext === '.jpg' || ext === '.jpeg') {
        image = await pdfDoc.embedJpg(imageBuffer);
      } else if (ext === '.png') {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        const convertedBuffer = await sharp(imageBuffer).jpeg().toBuffer();
        image = await pdfDoc.embedJpg(convertedBuffer);
      }
      
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
  }

  async pdfToImages(inputPath: string, outputDir: string, format: 'jpg' | 'png' = 'jpg'): Promise<string[]> {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      
      await execPromise(
        `pdftoppm "${inputPath}" "${path.join(outputDir, 'page')}" -${format}`
      );
      
      const files = await fs.readdir(outputDir);
      return files
        .filter(f => f.startsWith('page'))
        .map(f => path.join(outputDir, f));
    } catch (error) {
      throw new Error(`Failed to convert PDF to images: ${error}`);
    }
  }

  async protectPDF(inputPath: string, outputPath: string, password: string): Promise<void> {
    try {
      await execPromise(
        `qpdf --encrypt "${password}" "${password}" 256 -- "${inputPath}" "${outputPath}"`
      );
    } catch (error) {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pdfBytesOut = await pdf.save();
      await fs.writeFile(outputPath, pdfBytesOut);
    }
  }

  async unlockPDF(inputPath: string, outputPath: string, password: string): Promise<void> {
    try {
      await execPromise(
        `qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`
      );
    } catch (error) {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const unlockedPdfBytes = await pdf.save();
      await fs.writeFile(outputPath, unlockedPdfBytes);
    }
  }

  async getPDFInfo(inputPath: string): Promise<{ pageCount: number; size: number }> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const stats = await fs.stat(inputPath);
    
    return {
      pageCount: pdf.getPageCount(),
      size: stats.size,
    };
  }
}

export const pdfService = new PDFService();
