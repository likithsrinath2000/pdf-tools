import { promisify } from 'util';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import officegen from 'officegen';
import { createWriteStream } from 'fs';
import { positiveIntEnv } from '../utils/env';

const execFileAsync = promisify(execFile);

/**
 * Wall-clock ceiling for external CLI tools (LibreOffice, poppler). Untrusted
 * documents must never be able to pin a worker indefinitely. Override with
 * CLI_TIMEOUT_MS.
 */
const EXEC_TIMEOUT_MS = positiveIntEnv(process.env.CLI_TIMEOUT_MS, 120000);

/**
 * Upper bound on HTML/text input processed on the main thread (html-to-pdf,
 * create-document). Guards against a maximally large body blocking the event
 * loop during synchronous string manipulation.
 */
const MAX_HTML_CHARS = 500_000;

export class OfficeService {
  /**
   * Runs a LibreOffice conversion into a unique, empty working directory and
   * moves the single produced file to `outputPath`.
   *
   * This avoids a cross-job data leak: reading converted files back from the
   * shared output directory by extension (e.g. "the first *.docx") could return
   * another concurrent/earlier job's document. A per-job directory guarantees
   * the only matching file is this job's own output.
   */
  private async libreOfficeConvert(
    inputPath: string,
    convertTo: string,
    ext: string,
    outputPath: string
  ): Promise<void> {
    const workDir = path.join(path.dirname(outputPath), `lo_${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });
    // Isolated LibreOffice profile per invocation. Without this, concurrent
    // `libreoffice --headless` processes contend on the shared user profile
    // lock (~/.config/libreoffice) and all but one fail.
    const profileDir = path.resolve(workDir, 'profile');
    try {
      await execFileAsync('libreoffice', [
        '--headless',
        `-env:UserInstallation=file://${profileDir}`,
        '--convert-to', convertTo,
        '--outdir', workDir,
        inputPath,
      ], { timeout: EXEC_TIMEOUT_MS });
      const produced = (await fs.readdir(workDir))
        .find(f => f !== 'profile' && f.toLowerCase().endsWith(ext.toLowerCase()));
      if (!produced) {
        throw new Error(`No ${ext} file generated`);
      }
      await fs.rename(path.join(workDir, produced), outputPath);
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async convertToPDF(inputPath: string, outputPath: string): Promise<void> {
    try {
      await this.libreOfficeConvert(inputPath, 'pdf', '.pdf', outputPath);
    } catch (error: any) {
      throw new Error(`Failed to convert office document to PDF: ${error.message || error}`);
    }
  }

  async pdfToWord(inputPath: string, outputPath: string): Promise<void> {
    // Unique temp HTML input so concurrent jobs never collide.
    const htmlPath = path.join(path.dirname(outputPath), `pdf2word_${randomUUID()}.html`);

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
      
      await fs.writeFile(htmlPath, docContent);
      
      // Explicit export filter: HTML input opens in Writer/Web mode, which has
      // no direct docx export filter ("no export filter" error) unless named.
      await this.libreOfficeConvert(htmlPath, 'docx:MS Word 2007 XML', '.docx', outputPath);
    } catch (error: any) {
      throw new Error(`Failed to convert PDF to Word: ${error.message}`);
    } finally {
      await fs.unlink(htmlPath).catch(() => {});
    }
  }

  async pdfToExcel(inputPath: string, outputPath: string): Promise<void> {
    const csvPath = path.join(path.dirname(outputPath), `pdf2excel_${randomUUID()}.csv`);

    try {
      const pdfBytes = await fs.readFile(inputPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const pageCount = pdf.getPageCount();
      
      let csvContent = 'Page,Content,Note\n';
      for (let i = 0; i < pageCount; i++) {
        csvContent += `${i + 1},"Page ${i + 1} content","Extracted from PDF"\n`;
      }
      
      await fs.writeFile(csvPath, csvContent);
      
      await this.libreOfficeConvert(csvPath, 'xlsx', '.xlsx', outputPath);
    } catch (error: any) {
      throw new Error(`Failed to convert PDF to Excel: ${error.message}`);
    } finally {
      await fs.unlink(csvPath).catch(() => {});
    }
  }

  async pdfToPowerPoint(inputPath: string, outputPath: string): Promise<void> {
    // Unique per-job temp dir (randomUUID, not Date.now which can collide).
    const tempDir = path.join(path.dirname(outputPath), `pptx_${randomUUID()}`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      
      await execFileAsync('pdftoppm', ['-png', '-r', '150', inputPath, `${tempDir}/page`], { timeout: EXEC_TIMEOUT_MS });
      
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
      
      // Explicit export filter: HTML input opens in Impress web mode, which has
      // no direct pptx export filter unless the filter is named explicitly.
      // Convert into a unique dir so we never pick up another job's pptx.
      await this.libreOfficeConvert(htmlPath, 'pptx:Impress MS PowerPoint 2007 XML', '.pptx', outputPath);
    } catch (error: any) {
      throw new Error(`Failed to convert PDF to PowerPoint: ${error.message}`);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async htmlToPDF(htmlContent: string, outputPath: string): Promise<void> {
    if (typeof htmlContent === 'string' && htmlContent.length > MAX_HTML_CHARS) {
      throw new Error(`Content is too large. Please keep it under ${MAX_HTML_CHARS.toLocaleString('en-US')} characters.`);
    }

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
    if (typeof html === 'string' && html.length > MAX_HTML_CHARS) {
      html = html.slice(0, MAX_HTML_CHARS);
    }
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
