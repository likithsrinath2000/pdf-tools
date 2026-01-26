import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
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
  }, [toolId]);

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
   */
  const handleProcess = useCallback(async (currentToolId: string) => {
    if (!currentToolId) return;
    
    setStage("processing");
    setProgress(0);
    setError(null);

    try {
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
      setStage("download");
    } catch (err: any) {
      setError(err.message || "An error occurred during processing");
      setStage("error");
    }
  }, [files, processingOptions]);

  /**
   * Download the processed file
   */
  const handleDownload = useCallback(async (currentToolId: string) => {
    if (!currentJob) return;
    
    try {
      const filename = `${currentToolId}_${Date.now()}.${currentJob.outputFile?.split('.').pop()}`;
      await apiClient.downloadJob(currentJob.id, filename);
    } catch (err: any) {
      setError(err.message || "Failed to download file");
    }
  }, [currentJob]);

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
  }, []);

  /**
   * Delete the processed file and reset state
   */
  const handleDeleteFile = useCallback(async () => {
    if (!currentJob) return;
    
    try {
      await apiClient.deleteJob(currentJob.id);
      handleReset();
    } catch (err: any) {
      console.error("Failed to delete file:", err);
      handleReset();
    }
  }, [currentJob, handleReset]);

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
    handleFilesSelected,
    removeFile,
    handleReorder,
    handleProcess,
    handleDownload,
    handleReset,
    handleDeleteFile,
  };
}
