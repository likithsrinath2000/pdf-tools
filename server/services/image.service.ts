import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export class ImageService {
  async compressImage(
    inputPath: string,
    outputPath: string,
    quality: number
  ): Promise<void> {
    const ext = path.extname(inputPath).toLowerCase();
    let image = sharp(inputPath);
    
    if (ext === '.jpg' || ext === '.jpeg') {
      await image.jpeg({ quality }).toFile(outputPath);
    } else if (ext === '.png') {
      await image.png({ quality }).toFile(outputPath);
    } else if (ext === '.webp') {
      await image.webp({ quality }).toFile(outputPath);
    } else {
      await image.jpeg({ quality }).toFile(outputPath);
    }
  }

  async resizeImage(
    inputPath: string,
    outputPath: string,
    width?: number,
    height?: number,
    maintainAspectRatio: boolean = true
  ): Promise<void> {
    let image = sharp(inputPath);
    
    if (maintainAspectRatio) {
      image = image.resize(width, height, { fit: 'inside' });
    } else {
      image = image.resize(width, height, { fit: 'fill' });
    }
    
    await image.toFile(outputPath);
  }

  async cropImage(
    inputPath: string,
    outputPath: string,
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<void> {
    await sharp(inputPath)
      .extract({ left, top, width, height })
      .toFile(outputPath);
  }

  async rotateImage(
    inputPath: string,
    outputPath: string,
    angle: number
  ): Promise<void> {
    await sharp(inputPath)
      .rotate(angle)
      .toFile(outputPath);
  }

  async convertImageFormat(
    inputPath: string,
    outputPath: string,
    format: 'jpg' | 'png' | 'webp' | 'tiff'
  ): Promise<void> {
    let image = sharp(inputPath);
    
    switch (format) {
      case 'jpg':
        await image.jpeg().toFile(outputPath);
        break;
      case 'png':
        await image.png().toFile(outputPath);
        break;
      case 'webp':
        await image.webp().toFile(outputPath);
        break;
      case 'tiff':
        await image.tiff().toFile(outputPath);
        break;
    }
  }

  async getImageMetadata(inputPath: string): Promise<sharp.Metadata> {
    return await sharp(inputPath).metadata();
  }
}

export const imageService = new ImageService();
