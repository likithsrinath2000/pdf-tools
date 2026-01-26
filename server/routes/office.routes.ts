import { Router } from "express";

const router = Router();

/**
 * Office Routes Module
 * 
 * Office document operations are handled through the main job processing system at /api/jobs.
 * 
 * Supported office document tools:
 * 
 * Conversion to PDF:
 * - word-to-pdf: Convert Word documents (.docx) to PDF
 * - powerpoint-to-pdf: Convert PowerPoint presentations (.pptx) to PDF
 * - excel-to-pdf: Convert Excel spreadsheets (.xlsx) to PDF
 * - html-to-pdf: Convert HTML content to PDF
 * 
 * Conversion from PDF:
 * - pdf-to-word: Convert PDF to Word document (.docx)
 * - pdf-to-powerpoint: Convert PDF to PowerPoint presentation (.pptx)
 * - pdf-to-excel: Convert PDF to Excel spreadsheet (.xlsx)
 * 
 * Document Creation:
 * - create-document: Create a new PDF document from content
 * - create-word: Create a new Word document
 * - create-excel: Create a new Excel spreadsheet
 * - create-powerpoint: Create a new PowerPoint presentation
 * 
 * To process office documents, create a job via POST /api/jobs with:
 * - files: The document file(s) to process (not required for create-* tools)
 * - toolId: One of the supported office tool IDs
 * - options: Tool-specific options as JSON
 */

export default router;
