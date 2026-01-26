import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

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
    const baseName = path.basename(inputPath);
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to docx --outdir "${outputDir}" "${inputPath}"`
      );
      
      const files = await fs.readdir(outputDir);
      const docxFile = files.find(f => f.endsWith('.docx') && f.includes(baseName.substring(0, 8)));
      
      if (docxFile) {
        const generatedPath = path.join(outputDir, docxFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      } else {
        const anyDocx = files.find(f => f.endsWith('.docx'));
        if (anyDocx) {
          await fs.rename(path.join(outputDir, anyDocx), outputPath);
        } else {
          throw new Error('No DOCX file generated');
        }
      }
    } catch (error) {
      throw new Error(`Failed to convert PDF to Word: ${error}`);
    }
  }

  async pdfToExcel(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath);
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to xlsx --outdir "${outputDir}" "${inputPath}"`
      );
      
      const files = await fs.readdir(outputDir);
      const xlsxFile = files.find(f => f.endsWith('.xlsx') && f.includes(baseName.substring(0, 8)));
      
      if (xlsxFile) {
        const generatedPath = path.join(outputDir, xlsxFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      } else {
        const anyXlsx = files.find(f => f.endsWith('.xlsx'));
        if (anyXlsx) {
          await fs.rename(path.join(outputDir, anyXlsx), outputPath);
        } else {
          throw new Error('No XLSX file generated');
        }
      }
    } catch (error) {
      throw new Error(`Failed to convert PDF to Excel: ${error}`);
    }
  }

  async pdfToPowerPoint(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath);
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to pptx --outdir "${outputDir}" "${inputPath}"`
      );
      
      const files = await fs.readdir(outputDir);
      const pptxFile = files.find(f => f.endsWith('.pptx') && f.includes(baseName.substring(0, 8)));
      
      if (pptxFile) {
        const generatedPath = path.join(outputDir, pptxFile);
        if (generatedPath !== outputPath) {
          await fs.rename(generatedPath, outputPath);
        }
      } else {
        const anyPptx = files.find(f => f.endsWith('.pptx'));
        if (anyPptx) {
          await fs.rename(path.join(outputDir, anyPptx), outputPath);
        } else {
          throw new Error('No PPTX file generated');
        }
      }
    } catch (error) {
      throw new Error(`Failed to convert PDF to PowerPoint: ${error}`);
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
