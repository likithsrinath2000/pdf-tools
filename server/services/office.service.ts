import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

export class OfficeService {
  async convertToPDF(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`
      );
      
      const generatedPath = path.join(outputDir, `${baseName}.pdf`);
      
      if (generatedPath !== outputPath) {
        await fs.rename(generatedPath, outputPath);
      }
    } catch (error) {
      throw new Error(`Failed to convert office document to PDF: ${error}`);
    }
  }

  async pdfToWord(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to docx --outdir "${outputDir}" "${inputPath}"`
      );
      
      const generatedPath = path.join(outputDir, `${baseName}.docx`);
      
      if (generatedPath !== outputPath) {
        await fs.rename(generatedPath, outputPath);
      }
    } catch (error) {
      throw new Error(`Failed to convert PDF to Word: ${error}`);
    }
  }

  async pdfToExcel(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to xlsx --outdir "${outputDir}" "${inputPath}"`
      );
      
      const generatedPath = path.join(outputDir, `${baseName}.xlsx`);
      
      if (generatedPath !== outputPath) {
        await fs.rename(generatedPath, outputPath);
      }
    } catch (error) {
      throw new Error(`Failed to convert PDF to Excel: ${error}`);
    }
  }

  async pdfToPowerPoint(inputPath: string, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    
    try {
      await execPromise(
        `libreoffice --headless --convert-to pptx --outdir "${outputDir}" "${inputPath}"`
      );
      
      const generatedPath = path.join(outputDir, `${baseName}.pptx`);
      
      if (generatedPath !== outputPath) {
        await fs.rename(generatedPath, outputPath);
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
