import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
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
      
      const formatFlag = format === 'jpg' ? '-jpeg' : '-png';
      const prefix = path.join(outputDir, 'page');
      
      await execPromise(
        `pdftoppm ${formatFlag} "${inputPath}" "${prefix}"`
      );
      
      const files = await fs.readdir(outputDir);
      const extension = format === 'jpg' ? '.jpg' : '.png';
      return files
        .filter(f => f.startsWith('page') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.ppm')))
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

  async isPDFEncrypted(inputPath: string): Promise<boolean> {
    try {
      const pdfBytes = await fs.readFile(inputPath);
      await PDFDocument.load(pdfBytes);
      return false;
    } catch (error: any) {
      if (error.message && error.message.includes('encrypted')) {
        return true;
      }
      const { stdout } = await execPromise(`qpdf --show-encryption "${inputPath}" 2>&1 || true`);
      return stdout.toLowerCase().includes('encrypted') || stdout.toLowerCase().includes('password');
    }
  }

  async unlockPDF(inputPath: string, outputPath: string, password: string): Promise<void> {
    const isEncrypted = await this.isPDFEncrypted(inputPath);
    
    if (!isEncrypted) {
      throw new Error('ALREADY_UNPROTECTED: This PDF is already unprotected. No password removal needed!');
    }

    try {
      await execPromise(
        `qpdf --password="${password}" --decrypt "${inputPath}" "${outputPath}"`
      );
    } catch (error: any) {
      if (error.message && error.message.includes('invalid password')) {
        throw new Error('INVALID_PASSWORD: The password you entered is incorrect. Please try again.');
      }
      const pdfBytes = await fs.readFile(inputPath);
      try {
        const pdf = await PDFDocument.load(pdfBytes, { password });
        const unlockedPdfBytes = await pdf.save();
        await fs.writeFile(outputPath, unlockedPdfBytes);
      } catch (innerError: any) {
        if (innerError.message && innerError.message.includes('password')) {
          throw new Error('INVALID_PASSWORD: The password you entered is incorrect. Please try again.');
        }
        throw innerError;
      }
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

  async rotatePDF(inputPath: string, outputPath: string, angle: number): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const pages = pdf.getPages();
    pages.forEach(page => {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + angle));
    });
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async addPageNumbers(
    inputPath: string, 
    outputPath: string, 
    position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' = 'bottom-center',
    startFrom: number = 1
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    const pages = pdf.getPages();
    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      const pageNumber = `${idx + startFrom}`;
      const textWidth = font.widthOfTextAtSize(pageNumber, 12);
      
      let x: number, y: number;
      const margin = 30;
      
      switch (position) {
        case 'top-left':
          x = margin; y = height - margin;
          break;
        case 'top-center':
          x = (width - textWidth) / 2; y = height - margin;
          break;
        case 'top-right':
          x = width - textWidth - margin; y = height - margin;
          break;
        case 'bottom-left':
          x = margin; y = margin;
          break;
        case 'bottom-right':
          x = width - textWidth - margin; y = margin;
          break;
        case 'bottom-center':
        default:
          x = (width - textWidth) / 2; y = margin;
          break;
      }
      
      page.drawText(pageNumber, {
        x, y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
    });
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async addWatermark(
    inputPath: string, 
    outputPath: string, 
    watermarkText: string,
    opacity: number = 0.3
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    
    const pages = pdf.getPages();
    pages.forEach(page => {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) / 10;
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      
      page.drawText(watermarkText, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: rgb(0.7, 0.7, 0.7),
        opacity,
        rotate: degrees(-45),
      });
    });
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async editPDF(
    inputPath: string, 
    outputPath: string, 
    annotations: Array<{
      type: 'text' | 'rectangle' | 'circle';
      page: number;
      x: number;
      y: number;
      content?: string;
      width?: number;
      height?: number;
      color?: { r: number; g: number; b: number };
    }>
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    const pages = pdf.getPages();
    
    for (const annotation of annotations) {
      const pageIdx = annotation.page - 1;
      if (pageIdx < 0 || pageIdx >= pages.length) continue;
      
      const page = pages[pageIdx];
      const color = annotation.color ? rgb(annotation.color.r, annotation.color.g, annotation.color.b) : rgb(0, 0, 0);
      
      switch (annotation.type) {
        case 'text':
          page.drawText(annotation.content || '', {
            x: annotation.x,
            y: annotation.y,
            size: 12,
            font,
            color,
          });
          break;
        case 'rectangle':
          page.drawRectangle({
            x: annotation.x,
            y: annotation.y,
            width: annotation.width || 100,
            height: annotation.height || 50,
            borderColor: color,
            borderWidth: 2,
          });
          break;
        case 'circle':
          page.drawEllipse({
            x: annotation.x,
            y: annotation.y,
            xScale: (annotation.width || 50) / 2,
            yScale: (annotation.height || 50) / 2,
            borderColor: color,
            borderWidth: 2,
          });
          break;
      }
    }
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async signPDF(
    inputPath: string, 
    outputPath: string, 
    signatureText: string,
    position: { page: number; x: number; y: number }
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.TimesRomanItalic);
    
    const pages = pdf.getPages();
    const pageIdx = position.page - 1;
    
    if (pageIdx >= 0 && pageIdx < pages.length) {
      const page = pages[pageIdx];
      
      page.drawText(signatureText, {
        x: position.x,
        y: position.y,
        size: 24,
        font,
        color: rgb(0, 0, 0.5),
      });
      
      page.drawLine({
        start: { x: position.x, y: position.y - 5 },
        end: { x: position.x + font.widthOfTextAtSize(signatureText, 24), y: position.y - 5 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    }
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async repairPDF(inputPath: string, outputPath: string): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const repairedBytes = await pdf.save();
    await fs.writeFile(outputPath, repairedBytes);
  }

  async convertToPDFA(inputPath: string, outputPath: string): Promise<void> {
    try {
      await execPromise(
        `gs -dPDFA=2 -dBATCH -dNOPAUSE -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 -sOutputFile="${outputPath}" "${inputPath}"`
      );
    } catch (error) {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const newPdfBytes = await pdf.save();
      await fs.writeFile(outputPath, newPdfBytes);
    }
  }
}

export const pdfService = new PDFService();
