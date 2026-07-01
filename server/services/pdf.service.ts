import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs/promises';
import { promisify } from 'util';
import { execFile } from 'child_process';
import path from 'path';

const execFileAsync = promisify(execFile);

export class PDFService {
  async mergePDFs(inputPaths: string[], outputPath: string, pageOrder?: { fileIndex: number; pageNumber: number }[]): Promise<void> {
    const mergedPdf = await PDFDocument.create();
    
    if (pageOrder && pageOrder.length > 0) {
      const loadedPdfs: PDFDocument[] = [];
      for (const inputPath of inputPaths) {
        const pdfBytes = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        loadedPdfs.push(pdf);
      }
      
      for (const { fileIndex, pageNumber } of pageOrder) {
        if (loadedPdfs[fileIndex]) {
          const [copiedPage] = await mergedPdf.copyPages(loadedPdfs[fileIndex], [pageNumber - 1]);
          mergedPdf.addPage(copiedPage);
        }
      }
    } else {
      for (const inputPath of inputPaths) {
        const pdfBytes = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
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
    
    const effectivePageOrder = pageOrder.length > 0 
      ? pageOrder 
      : Array.from({ length: pdf.getPageCount() }, (_, i) => i + 1);
    
    const pageIndices = effectivePageOrder.map(p => p - 1);
    const pages = await newPdf.copyPages(pdf, pageIndices);
    
    pages.forEach((page, idx) => {
      const rotation = rotations[effectivePageOrder[idx]] || 0;
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
      await execFileAsync('gs', [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${setting}`,
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${outputPath}`,
        inputPath,
      ]);
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
      
      await execFileAsync('pdftoppm', [formatFlag, inputPath, prefix]);
      
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
    if (!password) {
      throw new Error('A password is required to protect this PDF.');
    }
    // qpdf must succeed; never silently fall back to writing an UNENCRYPTED file.
    try {
      await execFileAsync('qpdf', ['--encrypt', password, password, '256', '--', inputPath, outputPath]);
    } catch {
      // Do NOT surface the raw error: execFile embeds the full command line
      // (including the password twice) in error.message, which would leak into
      // logs, the job's error column, and the job-status API response.
      throw new Error('Failed to encrypt PDF. Please verify the file and try again.');
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
      try {
        const { stdout } = await execFileAsync('qpdf', ['--show-encryption', inputPath]);
        const out = stdout.toLowerCase();
        return out.includes('encrypted') || out.includes('password');
      } catch (qpdfError: any) {
        const out = `${qpdfError.stdout || ''}${qpdfError.stderr || ''}`.toLowerCase();
        return out.includes('encrypted') || out.includes('password');
      }
    }
  }

  async unlockPDF(inputPath: string, outputPath: string, password: string): Promise<void> {
    const isEncrypted = await this.isPDFEncrypted(inputPath);

    if (!isEncrypted) {
      throw new Error('ALREADY_UNPROTECTED: This PDF is already unprotected. No password removal needed!');
    }

    try {
      await execFileAsync('qpdf', [`--password=${password}`, '--decrypt', inputPath, outputPath]);
    } catch (error: any) {
      const details = `${error.stderr || ''}${error.message || ''}`.toLowerCase();
      if (details.includes('invalid password')) {
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

  async getPDFPreview(inputPath: string): Promise<{ pageCount: number; width: number; height: number; previewImage?: string }> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pageCount = pdf.getPageCount();
    
    const firstPage = pdf.getPages()[0];
    const { width, height } = firstPage.getSize();
    
    let previewImage: string | undefined;
    try {
      const tempPrefix = path.join(path.dirname(inputPath), `preview_${Date.now()}`);
      await execFileAsync('pdftoppm', [
        '-png', '-f', '1', '-l', '1', '-scale-to', '400', inputPath, tempPrefix,
      ]);
      
      const tempDir = path.dirname(inputPath);
      const files = await fs.readdir(tempDir);
      const previewFile = files.find(f => f.startsWith(`preview_`) && f.endsWith('.png'));
      
      if (previewFile) {
        const previewPath = path.join(tempDir, previewFile);
        const imageBuffer = await fs.readFile(previewPath);
        previewImage = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        await fs.unlink(previewPath).catch(() => {});
      }
    } catch (err) {
      previewImage = undefined;
    }
    
    return {
      pageCount,
      width,
      height,
      previewImage
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

  async rotatePages(inputPath: string, outputPath: string, rotations: Record<number, number>): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const pages = pdf.getPages();
    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      const rotation = rotations[pageNum];
      if (rotation !== undefined && rotation !== 0) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + rotation));
      }
    });
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async addPageNumbers(
    inputPath: string, 
    outputPath: string, 
    options: {
      position?: string;
      startNumber?: number;
      startPage?: number;
      endPage?: number | null;
      marginX?: number;
      marginY?: number;
      fontSize?: number;
      font?: string;
      color?: string;
      isBold?: boolean;
      isItalic?: boolean;
      format?: string;
    } = {}
  ): Promise<void> {
    const {
      position = 'bottom-center',
      startNumber = 1,
      startPage = 1,
      endPage = null,
      marginX = 40,
      marginY = 30,
      fontSize = 12,
      font: fontName = 'Helvetica',
      color = '#000000',
      isBold = false,
      format = 'number'
    } = options;

    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    let embeddedFont;
    if (fontName === 'Times-Roman') {
      embeddedFont = await pdf.embedFont(isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman);
    } else if (fontName === 'Courier') {
      embeddedFont = await pdf.embedFont(isBold ? StandardFonts.CourierBold : StandardFonts.Courier);
    } else {
      embeddedFont = await pdf.embedFont(isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
    }
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      } : { r: 0, g: 0, b: 0 };
    };

    const toRoman = (num: number): string => {
      const romanNumerals = [
        { value: 1000, numeral: 'M' }, { value: 900, numeral: 'CM' },
        { value: 500, numeral: 'D' }, { value: 400, numeral: 'CD' },
        { value: 100, numeral: 'C' }, { value: 90, numeral: 'XC' },
        { value: 50, numeral: 'L' }, { value: 40, numeral: 'XL' },
        { value: 10, numeral: 'X' }, { value: 9, numeral: 'IX' },
        { value: 5, numeral: 'V' }, { value: 4, numeral: 'IV' },
        { value: 1, numeral: 'I' }
      ];
      let result = '';
      for (const { value, numeral } of romanNumerals) {
        while (num >= value) { result += numeral; num -= value; }
      }
      return result.toLowerCase();
    };

    const toLetter = (num: number): string => {
      let result = '';
      while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
      }
      return result.toLowerCase();
    };
    
    const pages = pdf.getPages();
    const totalPages = pages.length;
    const lastPage = endPage !== null ? Math.min(endPage, totalPages) : totalPages;
    
    pages.forEach((page, idx) => {
      const pageNum = idx + 1;
      if (pageNum < startPage || pageNum > lastPage) return;
      
      const { width, height } = page.getSize();
      const displayNum = startNumber + (pageNum - startPage);
      
      let pageNumberText: string;
      switch (format) {
        case 'roman': pageNumberText = toRoman(displayNum); break;
        case 'letter': pageNumberText = toLetter(displayNum); break;
        case 'page-of': pageNumberText = `Page ${displayNum} of ${lastPage - startPage + startNumber}`; break;
        default: pageNumberText = displayNum.toString();
      }
      
      const textWidth = embeddedFont.widthOfTextAtSize(pageNumberText, fontSize);
      
      let x: number, y: number;
      const positionParts = position.split('-');
      const vertical = positionParts[0];
      const horizontal = positionParts[1] || 'center';
      
      switch (horizontal) {
        case 'left': x = marginX; break;
        case 'right': x = width - textWidth - marginX; break;
        default: x = (width - textWidth) / 2;
      }
      
      switch (vertical) {
        case 'top': y = height - marginY; break;
        case 'middle': y = height / 2; break;
        default: y = marginY;
      }
      
      const textColor = hexToRgb(color);
      
      page.drawText(pageNumberText, {
        x, y,
        size: fontSize,
        font: embeddedFont,
        color: rgb(textColor.r, textColor.g, textColor.b),
      });
    });
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async addWatermark(
    inputPath: string, 
    outputPath: string, 
    watermarkText: string,
    opacity: number = 0.3,
    orientation: number = -45,
    fontFamily: string = "helvetica-bold",
    fontSize?: number
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const fontMap: Record<string, typeof StandardFonts[keyof typeof StandardFonts]> = {
      "helvetica-bold": StandardFonts.HelveticaBold,
      "helvetica": StandardFonts.Helvetica,
      "times-roman": StandardFonts.TimesRoman,
      "times-bold": StandardFonts.TimesRomanBold,
      "courier": StandardFonts.Courier,
      "courier-bold": StandardFonts.CourierBold,
    };
    
    const selectedFont = fontMap[fontFamily] || StandardFonts.HelveticaBold;
    const font = await pdf.embedFont(selectedFont);
    
    const pages = pdf.getPages();
    pages.forEach(page => {
      const { width, height } = page.getSize();
      const actualFontSize = fontSize || Math.min(width, height) / 10;
      const textWidth = font.widthOfTextAtSize(watermarkText, actualFontSize);
      const textHeight = actualFontSize;
      
      const angle = orientation * (Math.PI / 180);
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      const x = centerX - (textWidth / 2) * Math.cos(angle) + (textHeight / 2) * Math.sin(angle);
      const y = centerY - (textWidth / 2) * Math.sin(angle) - (textHeight / 2) * Math.cos(angle);
      
      page.drawText(watermarkText, {
        x,
        y,
        size: actualFontSize,
        font,
        color: rgb(0.7, 0.7, 0.7),
        opacity,
        rotate: degrees(orientation),
      });
    });
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async editPDF(
    inputPath: string, 
    outputPath: string, 
    annotations: Array<{
      type: string;
      page: number;
      x: number;
      y: number;
      text?: string;
      width?: number;
      height?: number;
      color?: string;
      fontSize?: number;
      points?: Array<{ x: number; y: number }>;
      endX?: number;
      endY?: number;
    }>
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    const pages = pdf.getPages();

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        return rgb(
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255
        );
      }
      return rgb(0, 0, 0);
    };
    
    for (const annotation of annotations) {
      const pageIdx = annotation.page - 1;
      if (pageIdx < 0 || pageIdx >= pages.length) continue;
      
      const page = pages[pageIdx];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const color = annotation.color ? hexToRgb(annotation.color) : rgb(0, 0, 0);
      
      const scale = pageHeight / 800;
      const pdfX = annotation.x * scale / 1.5;
      const pdfY = pageHeight - (annotation.y * scale / 1.5);
      
      switch (annotation.type) {
        case 'text':
          const fontSize = (annotation.fontSize || 16) * scale / 1.5;
          page.drawText(annotation.text || '', {
            x: pdfX,
            y: pdfY - fontSize,
            size: fontSize,
            font,
            color,
          });
          break;
          
        case 'rectangle':
          const rectWidth = (annotation.width || 100) * scale / 1.5;
          const rectHeight = (annotation.height || 50) * scale / 1.5;
          page.drawRectangle({
            x: pdfX,
            y: pdfY - rectHeight,
            width: rectWidth,
            height: rectHeight,
            borderColor: color,
            borderWidth: 2,
          });
          break;
          
        case 'circle':
          const xScale = ((annotation.width || 50) / 2) * scale / 1.5;
          const yScale = ((annotation.height || 50) / 2) * scale / 1.5;
          page.drawEllipse({
            x: pdfX + xScale,
            y: pdfY - yScale,
            xScale,
            yScale,
            borderColor: color,
            borderWidth: 2,
          });
          break;
          
        case 'line':
          if (annotation.endX !== undefined && annotation.endY !== undefined) {
            const endPdfX = annotation.endX * scale / 1.5;
            const endPdfY = pageHeight - (annotation.endY * scale / 1.5);
            page.drawLine({
              start: { x: pdfX, y: pdfY },
              end: { x: endPdfX, y: endPdfY },
              thickness: 2,
              color,
            });
          }
          break;
          
        case 'highlight':
          const hlWidth = (annotation.width || 100) * scale / 1.5;
          const hlHeight = (annotation.height || 20) * scale / 1.5;
          page.drawRectangle({
            x: pdfX,
            y: pdfY - hlHeight,
            width: hlWidth,
            height: hlHeight,
            color,
            opacity: 0.3,
          });
          break;
          
        case 'freehand':
          if (annotation.points && annotation.points.length > 1) {
            for (let i = 1; i < annotation.points.length; i++) {
              const p1 = annotation.points[i - 1];
              const p2 = annotation.points[i];
              page.drawLine({
                start: { x: p1.x * scale / 1.5, y: pageHeight - (p1.y * scale / 1.5) },
                end: { x: p2.x * scale / 1.5, y: pageHeight - (p2.y * scale / 1.5) },
                thickness: 2,
                color,
              });
            }
          }
          break;
      }
    }
    
    const newPdfBytes = await pdf.save();
    await fs.writeFile(outputPath, newPdfBytes);
  }

  async signPDF(
    inputPath: string, 
    outputPath: string, 
    options: {
      signatureText?: string;
      signatureImage?: string;
      signatureType: 'text' | 'drawn';
      signatureScale?: number;
      position: { page: number; x: number; y: number };
    }
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const pages = pdf.getPages();
    const pageIdx = options.position.page - 1;
    const scale = options.signatureScale || 1;
    
    if (pageIdx >= 0 && pageIdx < pages.length) {
      const page = pages[pageIdx];
      
      if (options.signatureType === 'drawn' && options.signatureImage) {
        const base64Data = options.signatureImage.replace(/^data:image\/png;base64,/, '');
        const imageBytes = Buffer.from(base64Data, 'base64');
        const pngImage = await pdf.embedPng(imageBytes);
        
        const baseScaleFactor = 0.5;
        const imgWidth = pngImage.width * baseScaleFactor * scale;
        const imgHeight = pngImage.height * baseScaleFactor * scale;
        
        page.drawImage(pngImage, {
          x: options.position.x - imgWidth / 2,
          y: options.position.y - imgHeight / 2,
          width: imgWidth,
          height: imgHeight,
        });
      } else {
        const font = await pdf.embedFont(StandardFonts.TimesRomanItalic);
        const text = options.signatureText || 'Signature';
        const fontSize = 24 * scale;
        
        page.drawText(text, {
          x: options.position.x,
          y: options.position.y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.2, 0.4),
        });
        
        page.drawLine({
          start: { x: options.position.x, y: options.position.y - 5 },
          end: { x: options.position.x + font.widthOfTextAtSize(text, fontSize), y: options.position.y - 5 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      }
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
      await execFileAsync('gs', [
        '-dPDFA=2',
        '-dBATCH',
        '-dNOPAUSE',
        '-sColorConversionStrategy=UseDeviceIndependentColor',
        '-sDEVICE=pdfwrite',
        '-dPDFACompatibilityPolicy=1',
        `-sOutputFile=${outputPath}`,
        inputPath,
      ]);
    } catch (error) {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const newPdfBytes = await pdf.save();
      await fs.writeFile(outputPath, newPdfBytes);
    }
  }

  async pdfToText(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Use pdftotext from poppler-utils for accurate text extraction
      await execFileAsync('pdftotext', ['-layout', inputPath, outputPath]);
    } catch (error) {
      // Fallback: try without layout option
      try {
        await execFileAsync('pdftotext', [inputPath, outputPath]);
      } catch (fallbackError) {
        // Last resort: create empty text file with error message
        await fs.writeFile(outputPath, `Unable to extract text from PDF. The file may be scanned or image-based.\n\nTip: For scanned PDFs, try our OCR tool instead! (Coming soon)`);
      }
    }
  }

  async extractImages(inputPath: string, outputDir: string): Promise<string[]> {
    try {
      // Use pdfimages from poppler-utils to extract embedded images
      const prefix = path.join(outputDir, 'image');
      await execFileAsync('pdfimages', ['-all', inputPath, prefix]);
      
      const files = await fs.readdir(outputDir);
      const imageFiles = files
        .filter(f => f.startsWith('image') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.ppm') || f.endsWith('.pbm') || f.endsWith('.tif') || f.endsWith('.tiff')))
        .map(f => path.join(outputDir, f));
      
      // Convert any PPM/PBM files to PNG using sharp
      const convertedFiles: string[] = [];
      for (const file of imageFiles) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.ppm' || ext === '.pbm') {
          const pngPath = file.replace(ext, '.png');
          await sharp(file).png().toFile(pngPath);
          await fs.unlink(file).catch(() => {});
          convertedFiles.push(pngPath);
        } else {
          convertedFiles.push(file);
        }
      }
      
      if (convertedFiles.length === 0) {
        throw new Error('No images found in the PDF. This document might be text-only or have images in an unsupported format.');
      }
      
      return convertedFiles;
    } catch (error: any) {
      if (error.message && error.message.includes('No images found')) {
        throw error;
      }
      throw new Error(`Failed to extract images: ${error.message || error}`);
    }
  }
}

export const pdfService = new PDFService();
