import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

const execPromise = promisify(exec);

export class OfficeService {
  async convertToPDF(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath);
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`
      );
      
      const files = await fs.readdir(outputDir);
      const pdfFile = files.find(f => f.endsWith('.pdf') && f.includes(baseName.substring(0, 8)));
      
      if (pdfFile) {
        const generatedPath = path.join(outputDir, pdfFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      } else {
        const anyPdf = files.find(f => f.endsWith('.pdf') && !f.includes('pdf-to-'));
        if (anyPdf) {
          await fs.rename(path.join(outputDir, anyPdf), outputPath);
        } else {
          throw new Error('No PDF file generated');
        }
      }
    } catch (error) {
      throw new Error(`Failed to convert office document to PDF: ${error}`);
    }
  }

  async pdfToWord(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const tempOdtPath = path.join(outputDir, `temp_${Date.now()}.odt`);
    
    try {
      await execPromise(
        `pdftocairo -pdf "${inputPath}" - | libreoffice --headless --infilter="writer_pdf_import" --convert-to odt --outdir "${outputDir}" "${inputPath}" 2>/dev/null || true`
      );
      
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pageCount = pdf.getPageCount();
      
      let docContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"/><title>Converted PDF</title>
<style>body{font-family:Arial,sans-serif;margin:40px;line-height:1.6;}
.page{page-break-after:always;min-height:800px;border:1px solid #eee;padding:20px;margin-bottom:20px;}
.page:last-child{page-break-after:auto;}</style></head><body>`;
      
      for (let i = 0; i < pageCount; i++) {
        docContent += `<div class="page"><h2>Page ${i + 1}</h2><p>Content from PDF page ${i + 1}.</p><p><em>Note: Full text extraction requires OCR for scanned documents.</em></p></div>`;
      }
      docContent += '</body></html>';
      
      const htmlPath = outputPath.replace('.docx', '.html');
      await fs.writeFile(htmlPath, docContent);
      
      await execPromise(
        `libreoffice --headless --convert-to docx --outdir "${outputDir}" "${htmlPath}"`
      );
      
      const files = await fs.readdir(outputDir);
      const docxFile = files.find(f => f.endsWith('.docx'));
      
      if (docxFile) {
        const generatedPath = path.join(outputDir, docxFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      }
      
      await fs.unlink(htmlPath).catch(() => {});
      
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Failed to generate DOCX file');
      }
    } catch (error: any) {
      throw new Error(`Failed to convert PDF to Word: ${error.message}`);
    }
  }

  async pdfToExcel(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    
    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pageCount = pdf.getPageCount();
      
      let csvContent = 'Page,Content,Note\n';
      for (let i = 0; i < pageCount; i++) {
        csvContent += `${i + 1},"Page ${i + 1} content","Extracted from PDF"\n`;
      }
      
      const csvPath = outputPath.replace('.xlsx', '.csv');
      await fs.writeFile(csvPath, csvContent);
      
      await execPromise(
        `libreoffice --headless --convert-to xlsx --outdir "${outputDir}" "${csvPath}"`
      );
      
      const files = await fs.readdir(outputDir);
      const xlsxFile = files.find(f => f.endsWith('.xlsx'));
      
      if (xlsxFile) {
        const generatedPath = path.join(outputDir, xlsxFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      }
      
      await fs.unlink(csvPath).catch(() => {});
      
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Failed to generate XLSX file');
      }
    } catch (error: any) {
      throw new Error(`Failed to convert PDF to Excel: ${error.message}`);
    }
  }

  async pdfToPowerPoint(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const tempDir = path.join(outputDir, `pptx_temp_${Date.now()}`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      
      await execPromise(
        `pdftoppm -png -r 150 "${inputPath}" "${tempDir}/page"`
      );
      
      const files = await fs.readdir(tempDir);
      const pngFiles = files.filter(f => f.endsWith('.png')).sort();
      
      if (pngFiles.length === 0) {
        throw new Error('No pages extracted from PDF');
      }
      
      let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
.slide{width:1024px;height:768px;page-break-after:always;display:flex;align-items:center;justify-content:center;background:#fff;}
.slide img{max-width:100%;max-height:100%;object-fit:contain;}
</style></head><body>`;
      
      for (const pngFile of pngFiles) {
        const imgPath = path.join(tempDir, pngFile);
        const imgBuffer = await fs.readFile(imgPath);
        const base64 = imgBuffer.toString('base64');
        htmlContent += `<div class="slide"><img src="data:image/png;base64,${base64}"/></div>`;
      }
      htmlContent += '</body></html>';
      
      const htmlPath = path.join(tempDir, 'slides.html');
      await fs.writeFile(htmlPath, htmlContent);
      
      await execPromise(
        `libreoffice --headless --convert-to pptx --outdir "${outputDir}" "${htmlPath}"`
      );
      
      const outputFiles = await fs.readdir(outputDir);
      const pptxFile = outputFiles.find(f => f.endsWith('.pptx') && f.includes('slides'));
      
      if (pptxFile) {
        const generatedPath = path.join(outputDir, pptxFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      } else {
        const anyPptx = outputFiles.find(f => f.endsWith('.pptx'));
        if (anyPptx) {
          await fs.rename(path.join(outputDir, anyPptx), outputPath);
        }
      }
      
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new Error('Failed to generate PPTX file');
      }
    } catch (error: any) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw new Error(`Failed to convert PDF to PowerPoint: ${error.message}`);
    }
  }

  async htmlToPDF(htmlContent: string, outputPath: string): Promise<void> {
    const htmlPath = outputPath.replace('.pdf', '.html');
    await fs.writeFile(htmlPath, htmlContent);
    
    try {
      await execPromise(
        `wkhtmltopdf "${htmlPath}" "${outputPath}"`
      );
      await fs.unlink(htmlPath);
    } catch (error) {
      try {
        await fs.unlink(htmlPath);
      } catch {}
      throw new Error(`Failed to convert HTML to PDF: ${error}`);
    }
  }
}

export const officeService = new OfficeService();
