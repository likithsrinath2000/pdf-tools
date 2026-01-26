import { Router } from "express";

const router = Router();

/**
 * Image Routes Module
 * 
 * Image processing operations (compress, resize, crop, rotate, convert) are handled
 * through the main job processing system at /api/jobs.
 * 
 * Supported image tools:
 * - compress-image: Compress images with quality settings
 * - resize-image: Resize images with optional aspect ratio preservation
 * - crop-image: Crop images to specified dimensions
 * - rotate-image: Rotate images by specified degrees
 * - convert-image: Convert images between formats (jpg, png, webp, etc.)
 * 
 * To process images, create a job via POST /api/jobs with:
 * - files: The image file(s) to process
 * - toolId: One of the supported image tool IDs
 * - options: Tool-specific options as JSON
 */

export default router;
