/**
 * Client-Side Processing Orchestrator
 * 
 * Manages Web Workers for PDF and Image processing
 * Provides hybrid processing: client-side when possible, server fallback otherwise
 * Now includes device capability detection for smart routing!
 */

import { 
  getDeviceCapabilities, 
  shouldUseClientProcessing, 
  checkCurrentMemoryPressure,
  formatCapabilities,
  type DeviceCapabilities 
} from './deviceCapabilities';

// Cached device capabilities (initialized on first use)
let cachedCapabilities: DeviceCapabilities | null = null;
let capabilitiesPromise: Promise<DeviceCapabilities> | null = null;

/**
 * Get device capabilities (cached)
 */
async function getCapabilities(): Promise<DeviceCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }
  
  if (!capabilitiesPromise) {
    capabilitiesPromise = getDeviceCapabilities().then(caps => {
      cachedCapabilities = caps;
      console.log('[Device Capabilities]', formatCapabilities(caps));
      return caps;
    });
  }
  
  return capabilitiesPromise;
}

// Tools that can be processed entirely on the client
const CLIENT_PROCESSABLE_PDF_TOOLS = new Set([
  'merge-pdf',
  'split-pdf',
  'remove-pages',
  'extract-pages',
  'organize-pdf',
  'rotate-pdf',
  'add-page-numbers',
  'add-watermark',
  'edit-pdf',
  'sign-pdf',
  'repair-pdf',
  'jpg-to-pdf',
  'scan-pdf',
]);

const CLIENT_PROCESSABLE_IMAGE_TOOLS = new Set([
  'compress-image',
  'resize-image',
  'crop-image',
  'rotate-image',
  'convert-image',
]);

// Tools that MUST use server (require system binaries)
const SERVER_ONLY_TOOLS = new Set([
  'compress-pdf',      // Ghostscript
  'pdf-to-jpg',        // Poppler pdftoppm
  'protect-pdf',       // QPDF encryption
  'unlock-pdf',        // QPDF decryption
  'pdf-to-pdfa',       // Ghostscript
  'pdf-to-text',       // Poppler pdftotext
  'extract-images',    // Poppler pdfimages
  'word-to-pdf',       // LibreOffice
  'powerpoint-to-pdf', // LibreOffice
  'excel-to-pdf',      // LibreOffice
  'html-to-pdf',       // wkhtmltopdf (complex HTML)
  'pdf-to-word',       // LibreOffice
  'pdf-to-powerpoint', // LibreOffice
  'pdf-to-excel',      // LibreOffice
  'create-word',       // officegen
  'create-excel',      // officegen
  'create-powerpoint', // officegen
]);

// Size limits
const MAX_CLIENT_FILE_SIZE = 50 * 1024 * 1024; // 50MB - larger files go to server
const MAX_CLIENT_IMAGE_SIZE = 16 * 1024 * 1024; // 16MP in bytes (approx)

// Worker instances (lazy loaded)
let pdfWorker: Worker | null = null;
let imageWorker: Worker | null = null;

// Request tracking
let requestId = 0;
const pendingRequests = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}>();

/**
 * Check if a tool can be processed on the client
 * Now includes device capability checks!
 */
export function canProcessClientSide(toolId: string, files: File[]): {
  canProcess: boolean;
  reason?: string;
} {
  // Check if tool is server-only
  if (SERVER_ONLY_TOOLS.has(toolId)) {
    return { 
      canProcess: false, 
      reason: `Tool "${toolId}" requires server-side processing (system binaries)` 
    };
  }
  
  // Check if it's a client-processable tool
  const isPdfTool = CLIENT_PROCESSABLE_PDF_TOOLS.has(toolId);
  const isImageTool = CLIENT_PROCESSABLE_IMAGE_TOOLS.has(toolId);
  
  if (!isPdfTool && !isImageTool) {
    return { 
      canProcess: false, 
      reason: `Tool "${toolId}" is not configured for client-side processing` 
    };
  }
  
  // Check browser support for image processing
  if (isImageTool && typeof OffscreenCanvas === 'undefined') {
    return { 
      canProcess: false, 
      reason: 'OffscreenCanvas not supported in this browser. Using server.' 
    };
  }
  
  // Check Web Worker support
  if (typeof Worker === 'undefined') {
    return { 
      canProcess: false, 
      reason: 'Web Workers not supported. Using server.' 
    };
  }
  
  // Check current memory pressure (quick real-time check)
  const currentPressure = checkCurrentMemoryPressure();
  if (currentPressure === 'high') {
    return { 
      canProcess: false, 
      reason: 'High memory pressure detected. Using server to prevent browser slowdown.' 
    };
  }
  
  // Basic file size check (will be refined by async check with capabilities)
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const maxSize = isImageTool ? MAX_CLIENT_IMAGE_SIZE : MAX_CLIENT_FILE_SIZE;
  
  if (totalSize > maxSize) {
    return { 
      canProcess: false, 
      reason: `Files too large for client processing (${Math.round(totalSize / 1024 / 1024)}MB). Using server.` 
    };
  }
  
  return { canProcess: true };
}

/**
 * Async version that includes full device capability check
 * Use this for more accurate decisions when you can await
 */
export async function canProcessClientSideAsync(toolId: string, files: File[]): Promise<{
  canProcess: boolean;
  reason?: string;
  capabilities?: DeviceCapabilities;
}> {
  // First do the quick sync checks
  const syncResult = canProcessClientSide(toolId, files);
  if (!syncResult.canProcess) {
    return syncResult;
  }
  
  // Now do the full async capability check
  try {
    const capabilities = await getCapabilities();
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const isPdfTool = CLIENT_PROCESSABLE_PDF_TOOLS.has(toolId);
    const baseLimit = isPdfTool ? MAX_CLIENT_FILE_SIZE : MAX_CLIENT_IMAGE_SIZE;
    
    const { useClient, reason } = shouldUseClientProcessing(capabilities, totalSize, baseLimit);
    
    return {
      canProcess: useClient,
      reason,
      capabilities,
    };
  } catch (error) {
    // If capability detection fails, fall back to sync result
    console.warn('[Capabilities] Detection failed, using basic checks:', error);
    return syncResult;
  }
}

/**
 * Initialize PDF Worker
 */
function initPdfWorker(): Worker {
  if (!pdfWorker) {
    pdfWorker = new Worker(
      new URL('./workers/pdf.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    pdfWorker.onmessage = handleWorkerMessage;
    pdfWorker.onerror = handleWorkerError;
  }
  return pdfWorker;
}

/**
 * Initialize Image Worker
 */
function initImageWorker(): Worker {
  if (!imageWorker) {
    imageWorker = new Worker(
      new URL('./workers/image.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    imageWorker.onmessage = handleWorkerMessage;
    imageWorker.onerror = handleWorkerError;
  }
  return imageWorker;
}

/**
 * Handle worker messages
 */
function handleWorkerMessage(event: MessageEvent) {
  const { id, success, result, error, progress } = event.data;
  
  const pending = pendingRequests.get(id);
  if (!pending) return;
  
  if (progress !== undefined) {
    pending.onProgress?.(progress);
    return;
  }
  
  pendingRequests.delete(id);
  
  if (success) {
    pending.resolve(result);
  } else {
    pending.reject(new Error(error || 'Processing failed'));
  }
}

/**
 * Handle worker errors
 */
function handleWorkerError(event: ErrorEvent) {
  console.error('Worker error:', event);
  // Reject all pending requests
  pendingRequests.forEach((pending, id) => {
    pending.reject(new Error('Worker error: ' + event.message));
    pendingRequests.delete(id);
  });
}

/**
 * Send message to worker and wait for response
 */
function sendToWorker(
  worker: Worker, 
  type: string, 
  payload: any,
  onProgress?: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `req_${++requestId}`;
    
    pendingRequests.set(id, { resolve, reject, onProgress });
    
    worker.postMessage({ id, type, payload });
  });
}

/**
 * Process files on the client side
 */
export async function processClientSide(
  toolId: string,
  files: File[],
  options: any = {},
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  const isPdfTool = CLIENT_PROCESSABLE_PDF_TOOLS.has(toolId);
  const isImageTool = CLIENT_PROCESSABLE_IMAGE_TOOLS.has(toolId);
  
  if (!isPdfTool && !isImageTool) {
    throw new Error(`Tool "${toolId}" cannot be processed client-side`);
  }
  
  const worker = isPdfTool ? initPdfWorker() : initImageWorker();
  
  try {
    onProgress?.(10);
    
    let payload: any;
    
    // Prepare payload based on tool
    switch (toolId) {
      // PDF Tools
      case 'merge-pdf':
        payload = { files, options: options.pageOrder ? { pageOrder: options.pageOrder } : undefined };
        break;
      case 'split-pdf':
        payload = { file: files[0], ranges: options.ranges || [{ start: 1, end: 1 }] };
        break;
      case 'remove-pages':
        payload = { file: files[0], pagesToRemove: options.pagesToRemove || [] };
        break;
      case 'extract-pages':
        payload = { file: files[0], pagesToExtract: options.pagesToExtract || options.pages || [1] };
        break;
      case 'organize-pdf':
        payload = { 
          file: files[0], 
          pageOrder: options.pageOrder || [], 
          rotations: options.rotations || {} 
        };
        break;
      case 'rotate-pdf':
        payload = { file: files[0], angle: options.angle || 90 };
        break;
      case 'add-page-numbers':
        payload = { file: files[0], options };
        break;
      case 'add-watermark':
        payload = { file: files[0], options: { text: options.watermarkText, ...options } };
        break;
      case 'edit-pdf':
        payload = { file: files[0], annotations: options.annotations || [] };
        break;
      case 'sign-pdf':
        payload = { file: files[0], options };
        break;
      case 'repair-pdf':
        payload = { file: files[0] };
        break;
      case 'jpg-to-pdf':
      case 'scan-pdf':
        payload = { files };
        break;
        
      // Image Tools
      case 'compress-image':
        payload = { file: files[0], quality: options.quality || 80 };
        break;
      case 'resize-image':
        payload = { 
          file: files[0], 
          width: options.width, 
          height: options.height,
          maintainAspectRatio: options.maintainAspectRatio !== false
        };
        break;
      case 'crop-image':
        payload = { 
          file: files[0], 
          left: options.left || options.x || 0,
          top: options.top || options.y || 0,
          width: options.width,
          height: options.height
        };
        break;
      case 'rotate-image':
        payload = { file: files[0], angle: options.angle || 90 };
        break;
      case 'convert-image':
        payload = { file: files[0], format: options.format || 'jpg' };
        break;
        
      default:
        throw new Error(`Unknown tool: ${toolId}`);
    }
    
    onProgress?.(30);
    
    const result = await sendToWorker(worker, toolId, payload, (p) => {
      onProgress?.(30 + p * 0.6); // Map worker progress to 30-90%
    });
    
    onProgress?.(90);
    
    // Convert result to downloadable format
    const outputFile = await resultToFile(toolId, result, files[0]?.name);
    
    onProgress?.(100);
    
    return {
      success: true,
      outputFile,
      outputFileName: getOutputFileName(toolId, files[0]?.name),
      processedClientSide: true,
    };
  } catch (error: any) {
    // Check for specific errors that should trigger server fallback
    if (error.message === 'UNSUPPORTED_FORMAT' || 
        error.message === 'OFFSCREEN_CANVAS_NOT_SUPPORTED' ||
        error.message.includes('too large')) {
      throw new Error(`CLIENT_FALLBACK: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Convert worker result to a downloadable File/Blob
 */
async function resultToFile(
  toolId: string, 
  result: Uint8Array | Blob | Uint8Array[], 
  originalName: string
): Promise<Blob> {
  // Handle array results (split-pdf)
  if (Array.isArray(result)) {
    // For split, we'd need to zip - for now return first
    // In production, you'd use JSZip or similar
    const firstResult = result[0];
    // Create a new Uint8Array to ensure we have a proper ArrayBuffer
    const bytes = new Uint8Array(firstResult);
    return new Blob([bytes], { type: 'application/pdf' });
  }
  
  // Blob results (from image worker)
  if (result instanceof Blob) {
    return result;
  }
  
  // Uint8Array results (from PDF worker)
  const isPdfTool = CLIENT_PROCESSABLE_PDF_TOOLS.has(toolId);
  const mimeType = isPdfTool ? 'application/pdf' : 'image/jpeg';
  
  // Create a new Uint8Array to ensure we have a proper ArrayBuffer
  const bytes = new Uint8Array(result);
  return new Blob([bytes], { type: mimeType });
}

/**
 * Generate output filename
 */
function getOutputFileName(toolId: string, originalName?: string): string {
  const baseName = originalName?.replace(/\.[^.]+$/, '') || 'output';
  const timestamp = Date.now();
  
  const extensions: Record<string, string> = {
    'merge-pdf': 'pdf',
    'split-pdf': 'pdf',
    'remove-pages': 'pdf',
    'extract-pages': 'pdf',
    'organize-pdf': 'pdf',
    'rotate-pdf': 'pdf',
    'add-page-numbers': 'pdf',
    'add-watermark': 'pdf',
    'edit-pdf': 'pdf',
    'sign-pdf': 'pdf',
    'repair-pdf': 'pdf',
    'jpg-to-pdf': 'pdf',
    'scan-pdf': 'pdf',
    'compress-image': originalName?.split('.').pop() || 'jpg',
    'resize-image': originalName?.split('.').pop() || 'jpg',
    'crop-image': originalName?.split('.').pop() || 'jpg',
    'rotate-image': originalName?.split('.').pop() || 'jpg',
    'convert-image': 'jpg',
  };
  
  const ext = extensions[toolId] || 'pdf';
  return `${toolId}_${baseName}_${timestamp}.${ext}`;
}

/**
 * Processing result type
 */
export interface ProcessingResult {
  success: boolean;
  outputFile: Blob;
  outputFileName: string;
  processedClientSide: boolean;
  error?: string;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

/**
 * Cleanup workers (call on unmount if needed)
 */
export function terminateWorkers(): void {
  if (pdfWorker) {
    pdfWorker.terminate();
    pdfWorker = null;
  }
  if (imageWorker) {
    imageWorker.terminate();
    imageWorker = null;
  }
  pendingRequests.clear();
}

/**
 * Get info about client processing capabilities
 */
export function getClientCapabilities(): {
  webWorkersSupported: boolean;
  offscreenCanvasSupported: boolean;
  maxFileSize: number;
  clientProcessableTools: string[];
  serverOnlyTools: string[];
} {
  return {
    webWorkersSupported: typeof Worker !== 'undefined',
    offscreenCanvasSupported: typeof OffscreenCanvas !== 'undefined',
    maxFileSize: MAX_CLIENT_FILE_SIZE,
    clientProcessableTools: [
      ...Array.from(CLIENT_PROCESSABLE_PDF_TOOLS),
      ...Array.from(CLIENT_PROCESSABLE_IMAGE_TOOLS),
    ],
    serverOnlyTools: Array.from(SERVER_ONLY_TOOLS),
  };
}

/**
 * Get cached device capabilities (async)
 */
export async function getDeviceCapabilitiesInfo(): Promise<DeviceCapabilities> {
  return getCapabilities();
}

/**
 * Re-export types and utilities from deviceCapabilities
 */
export { formatCapabilities, type DeviceCapabilities } from './deviceCapabilities';
