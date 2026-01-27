/**
 * Image Processing Web Worker
 * Uses OffscreenCanvas for client-side image manipulation
 * Runs in a separate thread to avoid blocking the main UI
 */

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

// Size limits to prevent memory issues
const MAX_CANVAS_AREA = 16777216; // 16MP - safe for all browsers including Safari
const MAX_DIMENSION = 8192; // Max single dimension

// Post result to main thread
function postResult(id: string, result: any) {
  self.postMessage({ id, success: true, result } as WorkerResponse);
}

// Post error to main thread
function postError(id: string, error: string) {
  self.postMessage({ id, success: false, error } as WorkerResponse);
}

// Helper: Check if OffscreenCanvas is supported
function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

// Helper: Load image from File into ImageBitmap
async function loadImage(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

// Helper: Check if image size is within safe limits
function checkImageSize(width: number, height: number): { safe: boolean; reason?: string } {
  const area = width * height;
  
  if (area > MAX_CANVAS_AREA) {
    return { 
      safe: false, 
      reason: `Image too large (${Math.round(area / 1000000)}MP). Max supported: ${MAX_CANVAS_AREA / 1000000}MP. Use server processing.` 
    };
  }
  
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return { 
      safe: false, 
      reason: `Image dimension too large (${width}x${height}). Max: ${MAX_DIMENSION}px. Use server processing.` 
    };
  }
  
  return { safe: true };
}

// Helper: Convert canvas to Blob
async function canvasToBlob(
  canvas: OffscreenCanvas, 
  format: string, 
  quality: number
): Promise<Blob> {
  const mimeType = format === 'jpg' || format === 'jpeg' 
    ? 'image/jpeg' 
    : format === 'png' 
      ? 'image/png' 
      : format === 'webp' 
        ? 'image/webp' 
        : 'image/jpeg';
  
  return canvas.convertToBlob({ 
    type: mimeType, 
    quality: quality / 100 
  });
}

// ============ Image Operations ============

async function compressImage(file: File, quality: number): Promise<Blob> {
  const bitmap = await loadImage(file);
  const { width, height } = bitmap;
  
  const sizeCheck = checkImageSize(width, height);
  if (!sizeCheck.safe) {
    throw new Error(sizeCheck.reason);
  }
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  
  // Determine output format based on input
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
  
  return canvasToBlob(canvas, format, quality);
}

async function resizeImage(
  file: File, 
  targetWidth?: number, 
  targetHeight?: number, 
  maintainAspectRatio: boolean = true
): Promise<Blob> {
  const bitmap = await loadImage(file);
  const { width: originalWidth, height: originalHeight } = bitmap;
  
  let newWidth = targetWidth || originalWidth;
  let newHeight = targetHeight || originalHeight;
  
  if (maintainAspectRatio) {
    const aspectRatio = originalWidth / originalHeight;
    
    if (targetWidth && targetHeight) {
      // Fit within bounds
      const targetRatio = targetWidth / targetHeight;
      if (aspectRatio > targetRatio) {
        newWidth = targetWidth;
        newHeight = Math.round(targetWidth / aspectRatio);
      } else {
        newHeight = targetHeight;
        newWidth = Math.round(targetHeight * aspectRatio);
      }
    } else if (targetWidth) {
      newWidth = targetWidth;
      newHeight = Math.round(targetWidth / aspectRatio);
    } else if (targetHeight) {
      newHeight = targetHeight;
      newWidth = Math.round(targetHeight * aspectRatio);
    }
  }
  
  const sizeCheck = checkImageSize(newWidth, newHeight);
  if (!sizeCheck.safe) {
    throw new Error(sizeCheck.reason);
  }
  
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();
  
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
  
  return canvasToBlob(canvas, format, 90);
}

async function cropImage(
  file: File,
  left: number,
  top: number,
  width: number,
  height: number
): Promise<Blob> {
  const bitmap = await loadImage(file);
  
  // Validate crop region
  const cropLeft = Math.max(0, Math.round(left));
  const cropTop = Math.max(0, Math.round(top));
  const cropWidth = Math.min(Math.round(width), bitmap.width - cropLeft);
  const cropHeight = Math.min(Math.round(height), bitmap.height - cropTop);
  
  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error('Invalid crop dimensions');
  }
  
  const sizeCheck = checkImageSize(cropWidth, cropHeight);
  if (!sizeCheck.safe) {
    throw new Error(sizeCheck.reason);
  }
  
  const canvas = new OffscreenCanvas(cropWidth, cropHeight);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.drawImage(
    bitmap,
    cropLeft, cropTop, cropWidth, cropHeight,  // Source rectangle
    0, 0, cropWidth, cropHeight                 // Destination rectangle
  );
  bitmap.close();
  
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
  
  return canvasToBlob(canvas, format, 95);
}

async function rotateImage(file: File, angle: number): Promise<Blob> {
  const bitmap = await loadImage(file);
  const { width, height } = bitmap;
  
  // Normalize angle to 0, 90, 180, 270
  const normalizedAngle = ((angle % 360) + 360) % 360;
  
  // Calculate new dimensions after rotation
  let newWidth: number, newHeight: number;
  if (normalizedAngle === 90 || normalizedAngle === 270) {
    newWidth = height;
    newHeight = width;
  } else {
    newWidth = width;
    newHeight = height;
  }
  
  const sizeCheck = checkImageSize(newWidth, newHeight);
  if (!sizeCheck.safe) {
    throw new Error(sizeCheck.reason);
  }
  
  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Move to center, rotate, and draw
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate((normalizedAngle * Math.PI) / 180);
  ctx.drawImage(bitmap, -width / 2, -height / 2);
  bitmap.close();
  
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
  
  return canvasToBlob(canvas, format, 95);
}

async function convertFormat(
  file: File, 
  targetFormat: 'jpg' | 'png' | 'webp'
): Promise<Blob> {
  const bitmap = await loadImage(file);
  const { width, height } = bitmap;
  
  const sizeCheck = checkImageSize(width, height);
  if (!sizeCheck.safe) {
    throw new Error(sizeCheck.reason);
  }
  
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // For JPEG, fill with white background (no transparency)
  if (targetFormat === 'jpg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  
  return canvasToBlob(canvas, targetFormat, 90);
}

async function getImageMetadata(file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
}> {
  const bitmap = await loadImage(file);
  const metadata = {
    width: bitmap.width,
    height: bitmap.height,
    size: file.size,
    type: file.type
  };
  bitmap.close();
  return metadata;
}

// ============ Message Handler ============

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  // Check OffscreenCanvas support
  if (!isOffscreenCanvasSupported()) {
    postError(id, 'OFFSCREEN_CANVAS_NOT_SUPPORTED');
    return;
  }
  
  try {
    let result: any;
    
    switch (type) {
      case 'compress-image':
        result = await compressImage(payload.file, payload.quality);
        break;
        
      case 'resize-image':
        result = await resizeImage(
          payload.file, 
          payload.width, 
          payload.height, 
          payload.maintainAspectRatio
        );
        break;
        
      case 'crop-image':
        result = await cropImage(
          payload.file,
          payload.left,
          payload.top,
          payload.width,
          payload.height
        );
        break;
        
      case 'rotate-image':
        result = await rotateImage(payload.file, payload.angle);
        break;
        
      case 'convert-image':
        result = await convertFormat(payload.file, payload.format);
        break;
        
      case 'get-metadata':
        result = await getImageMetadata(payload.file);
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
