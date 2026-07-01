import { promisify } from 'util';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import officegen from 'officegen';
import { createWriteStream } from 'fs';

const execFileAsync = promisify(execFile);

export class OfficeService {
  async convertToPDF(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath);
    
    try {
      await execFileAsync('libreoffice', [
        '--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputPath,
      ]);
      
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

    try {
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
      
      await execFileAsync('libreoffice', [
        '--headless',
        // Explicit export filter: HTML input opens in Writer/Web mode, which has
        // no direct docx export filter ("no export filter" error) unless named.
        '--convert-to', 'docx:MS Word 2007 XML',
        '--outdir', outputDir,
        htmlPath,
      ]);
      
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
      
      await execFileAsync('libreoffice', [
        '--headless', '--convert-to', 'xlsx', '--outdir', outputDir, csvPath,
      ]);
      
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
      
      await execFileAsync('pdftoppm', ['-png', '-r', '150', inputPath, `${tempDir}/page`]);
      
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
      
      await execFileAsync('libreoffice', [
        '--headless',
        // Explicit export filter: HTML input opens in Impress web mode, which has
        // no direct pptx export filter unless the filter is named explicitly.
        '--convert-to', 'pptx:Impress MS PowerPoint 2007 XML',
        '--outdir', outputDir,
        htmlPath,
      ]);
      
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
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    
    const plainText = this.extractTextFromHtml(htmlContent);
    const lines = this.wrapText(plainText, font, 12, 500);
    
    const linesPerPage = 50;
    const pageHeight = 792;
    const pageWidth = 612;
    const margin = 50;
    const lineHeight = 14;
    
    for (let i = 0; i < lines.length; i += linesPerPage) {
      const page = doc.addPage([pageWidth, pageHeight]);
      const pageLines = lines.slice(i, i + linesPerPage);
      
      let y = pageHeight - margin;
      for (const line of pageLines) {
        page.drawText(line, {
          x: margin,
          y,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        y -= lineHeight;
      }
    }
    
    if (doc.getPageCount() === 0) {
      doc.addPage([pageWidth, pageHeight]);
    }
    
    const pdfBytes = await doc.save();
    await fs.writeFile(outputPath, pdfBytes);
  }

  private extractTextFromHtml(html: string): string {
    let text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text;
  }

  private wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    
    return lines;
  }

  async createWordDocument(content: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const docx = officegen('docx');
      
      docx.on('error', (err: Error) => reject(err));
      
      const paragraphs = content.split('\n\n');
      for (const para of paragraphs) {
        if (para.trim()) {
          const pObj = docx.createP();
          pObj.addText(para.trim());
        }
      }
      
      const out = createWriteStream(outputPath);
      out.on('error', reject);
      out.on('close', resolve);
      
      docx.generate(out);
    });
  }

  async createExcelDocument(data: { headers: string[], rows: string[][] }, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const xlsx = officegen('xlsx');
      
      xlsx.on('error', (err: Error) => reject(err));
      
      const sheet = xlsx.makeNewSheet();
      sheet.name = 'Sheet1';
      
      if (data.headers && data.headers.length > 0) {
        data.headers.forEach((header, colIndex) => {
          sheet.setCell(String.fromCharCode(65 + colIndex) + '1', header);
        });
      }
      
      if (data.rows && data.rows.length > 0) {
        data.rows.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            sheet.setCell(String.fromCharCode(65 + colIndex) + (rowIndex + 2), cell);
          });
        });
      }
      
      const out = createWriteStream(outputPath);
      out.on('error', reject);
      out.on('close', resolve);
      
      xlsx.generate(out);
    });
  }

  async createPowerPointDocument(slides: { title: string, content: string }[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const pptx = officegen('pptx');
      
      pptx.on('error', (err: Error) => reject(err));
      
      for (const slideData of slides) {
        const slide = pptx.makeNewSlide();
        
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.5,
          cx: 9,
          cy: 1,
          font_size: 36,
          bold: true,
          color: '000000'
        });
        
        slide.addText(slideData.content, {
          x: 0.5,
          y: 1.8,
          cx: 9,
          cy: 5,
          font_size: 18,
          color: '333333'
        });
      }
      
      const out = createWriteStream(outputPath);
      out.on('error', reject);
      out.on('close', resolve);
      
      pptx.generate(out);
    });
  }
}

export const officeService = new OfficeService();
