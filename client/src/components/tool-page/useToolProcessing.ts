import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { 
  canProcessClientSideAsync, 
  processClientSide, 
  downloadBlob,
  type ProcessingResult 
} from "@/lib/clientProcessing";
import type { ProcessingJob } from "@shared/schema";

/**
 * Processing stage type that tracks the current state of the tool workflow
 * - upload: Initial state, waiting for files
 * - files-selected: Files have been selected, ready for processing
 * - processing: Files are being processed on the server
 * - download: Processing complete, files ready for download
 * - error: An error occurred during processing
 */
export type Stage = "upload" | "files-selected" | "processing" | "download" | "error";

/**
 * Processing mode prediction - shown before user clicks process
 */
export interface ProcessingModePrediction {
  mode: 'client' | 'server' | 'checking';
  reason: string;
  deviceScore?: number;
}

/**
 * Return type for the useToolProcessing hook
 */
export interface UseToolProcessingResult {
  stage: Stage;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  progress: number;
  currentJob: ProcessingJob | null;
  error: string | null;
  processingOptions: any;
  setProcessingOptions: React.Dispatch<React.SetStateAction<any>>;
  pdfNotEncrypted: boolean;
  setPdfNotEncrypted: React.Dispatch<React.SetStateAction<boolean>>;
  checkingEncryption: boolean;
  processedClientSide: boolean;
  clientResult: ProcessingResult | null;
  processingPrediction: ProcessingModePrediction | null;
  handleFilesSelected: (selectedFiles: File[], toolId: string, maxFiles?: number) => Promise<void>;
  removeFile: (index: number) => void;
  handleReorder: (reorderedFiles: File[]) => void;
  handleProcess: (toolId: string) => Promise<void>;
  handleDownload: (toolId: string) => Promise<void>;
  handleReset: () => void;
  handleDeleteFile: () => Promise<void>;
}

/**
 * Custom hook that manages the processing logic and state for the Tool page.
 * Handles file selection, upload, processing, download, and error states.
 * Now supports hybrid processing: client-side when possible, server fallback otherwise.
 * 
 * @param toolId - The ID of the current tool being used
 * @returns Object containing state and handlers for the tool processing workflow
 */
export function useToolProcessing(toolId: string | undefined): UseToolProcessingResult {
  const [stage, setStage] = useState<Stage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingOptions, setProcessingOptions] = useState<any>({});
  const [pdfNotEncrypted, setPdfNotEncrypted] = useState(false);
  const [checkingEncryption, setCheckingEncryption] = useState(false);
  // Client-side processing state
  const [processedClientSide, setProcessedClientSide] = useState(false);
  const [clientResult, setClientResult] = useState<ProcessingResult | null>(null);
  // Processing mode prediction (shown before user clicks process)
  const [processingPrediction, setProcessingPrediction] = useState<ProcessingModePrediction | null>(null);

  // Reset all state when tool changes
  useEffect(() => {
    setStage("upload");
    setFiles([]);
    setProgress(0);
    setCurrentJob(null);
    setError(null);
    setProcessingOptions({});
    setPdfNotEncrypted(false);
    setCheckingEncryption(false);
    setProcessedClientSide(false);
    setClientResult(null);
    setProcessingPrediction(null);
  }, [toolId]);

  // Update processing prediction when files change
  useEffect(() => {
    if (!toolId || files.length === 0) {
      setProcessingPrediction(null);
      return;
    }

    // Set checking state
    setProcessingPrediction({ mode: 'checking', reason: 'Analyzing...' });

    // Check processing mode asynchronously
    const checkMode = async () => {
      try {
        const result = await canProcessClientSideAsync(toolId, files);
        setProcessingPrediction({
          mode: result.canProcess ? 'client' : 'server',
          reason: result.reason || (result.canProcess 
            ? 'Will be processed locally in your browser' 
            : 'Will be processed on our secure servers'),
          deviceScore: result.capabilities?.performanceScore,
        });
      } catch (err) {
        // Default to server on error
        setProcessingPrediction({
          mode: 'server',
          reason: 'Will be processed on our secure servers',
        });
      }
    };

    checkMode();
  }, [toolId, files]);

  /**
   * Handle file selection - validates files, checks for PDF encryption if needed
   */
  const handleFilesSelected = useCallback(async (
    selectedFiles: File[], 
    currentToolId: string, 
    maxFiles?: number
  ) => {
    const filesToUse = maxFiles ? selectedFiles.slice(0, maxFiles) : selectedFiles;
    setFiles(prev => maxFiles ? filesToUse : [...prev, ...filesToUse]);
    setStage("files-selected");
    
    // Check PDF encryption status for unlock-pdf tool
    if (currentToolId === "unlock-pdf" && filesToUse.length > 0) {
      setCheckingEncryption(true);
      setPdfNotEncrypted(false);
      try {
        const isEncrypted = await apiClient.checkPDFEncrypted(filesToUse[0]);
        if (!isEncrypted) {
          setPdfNotEncrypted(true);
        }
      } catch (err) {
        console.error("Failed to check encryption:", err);
      } finally {
        setCheckingEncryption(false);
      }
    }
  }, []);

  /**
   * Remove a file from the selection by index
   */
  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setStage("upload");
      }
      return newFiles;
    });
  }, []);

  /**
   * Handle reordering of files (used by merge-pdf and similar tools)
   */
  const handleReorder = useCallback((reorderedFiles: File[]) => {
    setFiles(reorderedFiles);
  }, []);

  /**
   * Start processing the selected files with the current tool
   * Uses hybrid processing: tries client-side first, falls back to server if needed
   */
  const handleProcess = useCallback(async (currentToolId: string) => {
    if (!currentToolId) return;
    
    setStage("processing");
    setProgress(0);
    setError(null);
    setClientResult(null);

    // Check if we can process client-side (async for full device capability check)
    const clientCheck = await canProcessClientSideAsync(currentToolId, files);
    
    if (clientCheck.canProcess) {
      // Set client-side flag BEFORE processing so UI shows the indicator
      setProcessedClientSide(true);
      
      // Try client-side processing first
      try {
        console.log(`[Hybrid] Processing "${currentToolId}" client-side`);
        if (clientCheck.capabilities) {
          console.log(`[Hybrid] Device score: ${clientCheck.capabilities.performanceScore}/100, Recommendation: ${clientCheck.capabilities.recommendation}`);
        }
        
        const result = await processClientSide(
          currentToolId,
          files,
          processingOptions,
          (p) => setProgress(p)
        );
        
        setClientResult(result);
        // Keep processedClientSide true
        setStage("download");
        console.log(`[Hybrid] Client-side processing complete`);
        return;
      } catch (clientError: any) {
        // Check if we should fallback to server
        if (clientError.message?.startsWith('CLIENT_FALLBACK:')) {
          console.log(`[Hybrid] Falling back to server: ${clientError.message}`);
          // Reset client-side flag since we're falling back to server
          setProcessedClientSide(false);
          // Continue to server processing below
        } else {
          // Actual error, not a fallback trigger
          console.error(`[Hybrid] Client-side error:`, clientError);
          setError(clientError.message || "Client-side processing failed");
          setStage("error");
          return;
        }
      }
    } else {
      setProcessedClientSide(false);
      console.log(`[Hybrid] Using server: ${clientCheck.reason}`);
      if (clientCheck.capabilities) {
        console.log(`[Hybrid] Device score: ${clientCheck.capabilities.performanceScore}/100`);
      }
    }

    // Server-side processing (fallback or required)
    try {
      setProgress(0);
      
      // Create a job on the server and upload files
      const { jobId } = await apiClient.createJob(currentToolId, files, processingOptions);
      
      // Poll for job status updates
      await apiClient.pollJobStatus(jobId, (job) => {
        setCurrentJob(job);
        setProgress(job.progress || 0);
      });

      // Fetch final job status
      const finalJob = await apiClient.getJob(jobId);
      setCurrentJob(finalJob);
      setProcessedClientSide(false);
      setStage("download");
    } catch (err: any) {
      setError(err.message || "An error occurred during processing");
      setStage("error");
    }
  }, [files, processingOptions]);

  /**
   * Download the processed file
   * Handles both client-side results and server-side results
   */
  const handleDownload = useCallback(async (currentToolId: string) => {
    try {
      // Client-side result - download directly from memory
      if (processedClientSide && clientResult) {
        downloadBlob(clientResult.outputFile, clientResult.outputFileName);
        return;
      }
      
      // Server-side result - download from server
      if (!currentJob) return;
      
      const filename = `${currentToolId}_${Date.now()}.${currentJob.outputFile?.split('.').pop()}`;
      await apiClient.downloadJob(currentJob.id, filename);
    } catch (err: any) {
      setError(err.message || "Failed to download file");
    }
  }, [currentJob, processedClientSide, clientResult]);

  /**
   * Reset all state to start a new processing session
   */
  const handleReset = useCallback(() => {
    setStage("upload");
    setFiles([]);
    setProgress(0);
    setCurrentJob(null);
    setError(null);
    setProcessingOptions({});
    setProcessedClientSide(false);
    setClientResult(null);
    setProcessingPrediction(null);
  }, []);

  /**
   * Delete the processed file and reset state
   * For client-side processing, just resets state (nothing on server to delete)
   */
  const handleDeleteFile = useCallback(async () => {
    // Client-side processed files don't need server cleanup
    if (processedClientSide) {
      handleReset();
      return;
    }
    
    if (!currentJob) return;
    
    try {
      await apiClient.deleteJob(currentJob.id);
      handleReset();
    } catch (err: any) {
      console.error("Failed to delete file:", err);
      handleReset();
    }
  }, [currentJob, processedClientSide, handleReset]);

  return {
    stage,
    setStage,
    files,
    setFiles,
    progress,
    currentJob,
    error,
    processingOptions,
    setProcessingOptions,
    pdfNotEncrypted,
    setPdfNotEncrypted,
    checkingEncryption,
    processedClientSide,
    clientResult,
    processingPrediction,
    handleFilesSelected,
    removeFile,
    handleReorder,
    handleProcess,
    handleDownload,
    handleReset,
    handleDeleteFile,
  };
}
