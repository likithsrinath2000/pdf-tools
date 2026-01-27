/**
 * PDF Processing Web Worker
 * Uses pdf-lib for client-side PDF manipulation
 * Runs in a separate thread to avoid blocking the main UI
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

// Message types for communication with main thread
type WorkerMessage = {
  id: string;
  type: string;
  payload: any;
};

type WorkerResponse = {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  progress?: number;
};

// Post progress updates to main thread
function postProgress(id: string, progress: number) {
  self.postMessage({ id, success: true, progress } as WorkerResponse);
}

// Post result to main thread
function postResult(id: string, result: any) {
  self.postMessage({ id, success: true, result } as WorkerResponse);
}

// Post error to main thread
function postError(id: string, error: string) {
  self.postMessage({ id, success: false, error } as WorkerResponse);
}

// Helper: Convert File/Blob to ArrayBuffer
async function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

// Helper: Convert hex color to rgb values
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

// ============ PDF Operations ============

async function mergePDFs(files: File[], options?: { pageOrder?: { fileIndex: number; pageNumber: number }[] }): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const loadedPdfs: PDFDocument[] = [];
  
  // Load all PDFs
  for (let i = 0; i < files.length; i++) {
    const pdfBytes = await fileToArrayBuffer(files[i]);
    const pdf = await PDFDocument.load(pdfBytes);
    loadedPdfs.push(pdf);
  }
  
  if (options?.pageOrder && options.pageOrder.length > 0) {
    // Custom page order
    for (const { fileIndex, pageNumber } of options.pageOrder) {
      if (loadedPdfs[fileIndex]) {
        const [copiedPage] = await mergedPdf.copyPages(loadedPdfs[fileIndex], [pageNumber - 1]);
        mergedPdf.addPage(copiedPage);
      }
    }
  } else {
    // Sequential merge
    for (const pdf of loadedPdfs) {
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
  }
  
  return mergedPdf.save();
}

async function splitPDF(file: File, ranges: { start: number; end: number }[]): Promise<Uint8Array[]> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  const results: Uint8Array[] = [];
  
  for (const { start, end } of ranges) {
    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start + 1 }, (_, idx) => start + idx - 1);
    const pages = await newPdf.copyPages(pdf, pageIndices);
    pages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save());
  }
  
  return results;
}

async function removePages(file: File, pagesToRemove: number[]): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  
  const allPages = pdf.getPageIndices();
  const pagesToKeep = allPages.filter(idx => !pagesToRemove.includes(idx + 1));
  
  const pages = await newPdf.copyPages(pdf, pagesToKeep);
  pages.forEach((page) => newPdf.addPage(page));
  
  return newPdf.save();
}

async function extractPages(file: File, pagesToExtract: number[]): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  
  const pageIndices = pagesToExtract.map(p => p - 1);
  const pages = await newPdf.copyPages(pdf, pageIndices);
  pages.forEach((page) => newPdf.addPage(page));
  
  return newPdf.save();
}

async function organizePDF(file: File, pageOrder: number[], rotations: Record<number, number>): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
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
  
  return newPdf.save();
}

async function rotatePDF(file: File, angle: number): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  
  const pages = pdf.getPages();
  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  });
  
  return pdf.save();
}

async function rotatePages(file: File, rotations: Record<number, number>): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
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
  
  return pdf.save();
}

async function addPageNumbers(file: File, options: {
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
  format?: string;
}): Promise<Uint8Array> {
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

  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  
  let embeddedFont;
  if (fontName === 'Times-Roman') {
    embeddedFont = await pdf.embedFont(isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman);
  } else if (fontName === 'Courier') {
    embeddedFont = await pdf.embedFont(isBold ? StandardFonts.CourierBold : StandardFonts.Courier);
  } else {
    embeddedFont = await pdf.embedFont(isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  }

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
  
  return pdf.save();
}

async function addWatermark(file: File, options: {
  text: string;
  opacity?: number;
  orientation?: number;
  fontFamily?: string;
  fontSize?: number;
}): Promise<Uint8Array> {
  const {
    text,
    opacity = 0.3,
    orientation = -45,
    fontFamily = 'helvetica-bold',
    fontSize
  } = options;

  const pdfBytes = await fileToArrayBuffer(file);
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
    const textWidth = font.widthOfTextAtSize(text, actualFontSize);
    const textHeight = actualFontSize;
    
    const angle = orientation * (Math.PI / 180);
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    const x = centerX - (textWidth / 2) * Math.cos(angle) + (textHeight / 2) * Math.sin(angle);
    const y = centerY - (textWidth / 2) * Math.sin(angle) - (textHeight / 2) * Math.cos(angle);
    
    page.drawText(text, {
      x,
      y,
      size: actualFontSize,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity,
      rotate: degrees(orientation),
    });
  });
  
  return pdf.save();
}

async function editPDF(file: File, annotations: Array<{
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
}>): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  
  const pages = pdf.getPages();

  for (const annotation of annotations) {
    const pageIdx = annotation.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;
    
    const page = pages[pageIdx];
    const { height: pageHeight } = page.getSize();
    const color = annotation.color ? rgb(...Object.values(hexToRgb(annotation.color)) as [number, number, number]) : rgb(0, 0, 0);
    
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
  
  return pdf.save();
}

async function signPDF(file: File, options: {
  signatureText?: string;
  signatureImage?: string;
  signatureType: 'text' | 'drawn';
  signatureScale?: number;
  position: { page: number; x: number; y: number };
}): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  
  const pages = pdf.getPages();
  const pageIdx = options.position.page - 1;
  const scale = options.signatureScale || 1;
  
  if (pageIdx >= 0 && pageIdx < pages.length) {
    const page = pages[pageIdx];
    
    if (options.signatureType === 'drawn' && options.signatureImage) {
      const base64Data = options.signatureImage.replace(/^data:image\/png;base64,/, '');
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
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
  
  return pdf.save();
}

async function repairPDF(file: File): Promise<Uint8Array> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  return pdf.save();
}

async function imagesToPDF(files: File[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const imageBuffer = await fileToArrayBuffer(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    let image;
    if (ext === 'jpg' || ext === 'jpeg') {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else if (ext === 'png') {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      // For other formats, we need to convert via canvas
      // This will be handled by falling back to server
      throw new Error('UNSUPPORTED_FORMAT');
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  return pdfDoc.save();
}

async function getPDFInfo(file: File): Promise<{ pageCount: number; size: number }> {
  const pdfBytes = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(pdfBytes);
  
  return {
    pageCount: pdf.getPageCount(),
    size: file.size,
  };
}

// ============ Message Handler ============

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'merge-pdf':
        result = await mergePDFs(payload.files, payload.options);
        break;
      case 'split-pdf':
        result = await splitPDF(payload.file, payload.ranges);
        break;
      case 'remove-pages':
        result = await removePages(payload.file, payload.pagesToRemove);
        break;
      case 'extract-pages':
        result = await extractPages(payload.file, payload.pagesToExtract);
        break;
      case 'organize-pdf':
        result = await organizePDF(payload.file, payload.pageOrder, payload.rotations);
        break;
      case 'rotate-pdf':
        result = await rotatePDF(payload.file, payload.angle);
        break;
      case 'rotate-pages':
        result = await rotatePages(payload.file, payload.rotations);
        break;
      case 'add-page-numbers':
        result = await addPageNumbers(payload.file, payload.options);
        break;
      case 'add-watermark':
        result = await addWatermark(payload.file, payload.options);
        break;
      case 'edit-pdf':
        result = await editPDF(payload.file, payload.annotations);
        break;
      case 'sign-pdf':
        result = await signPDF(payload.file, payload.options);
        break;
      case 'repair-pdf':
        result = await repairPDF(payload.file);
        break;
      case 'jpg-to-pdf':
      case 'scan-pdf':
        result = await imagesToPDF(payload.files);
        break;
      case 'get-pdf-info':
        result = await getPDFInfo(payload.file);
        break;
      default:
        throw new Error(`Unknown operation: ${type}`);
    }
    
    postResult(id, result);
  } catch (error: any) {
    postError(id, error.message || 'Processing failed');
  }
};

export {};
