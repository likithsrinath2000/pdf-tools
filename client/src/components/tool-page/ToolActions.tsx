import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Download, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Plus,
  Cpu,
  Cloud,
  Shield,
  Zap,
  Loader2,
} from "lucide-react";
import type { ProcessingModePrediction } from "./useToolProcessing";

/**
 * Processing mode indicator badge - shows before user clicks process
 */
interface ProcessingModeIndicatorProps {
  prediction: ProcessingModePrediction | null;
}

const ProcessingModeIndicator = React.memo(function ProcessingModeIndicator({
  prediction,
}: ProcessingModeIndicatorProps) {
  if (!prediction) return null;

  if (prediction.mode === 'checking') {
    return (
      <div className="flex items-center justify-center mb-4 animate-in fade-in duration-300">
        <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing your files...</span>
        </div>
      </div>
    );
  }

  if (prediction.mode === 'client') {
    return (
      <div className="flex flex-col items-center gap-2 mb-4 animate-in fade-in slide-in-from-top duration-500">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-full px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <Cpu className="w-4 h-4" />
          <span>Will process in your browser</span>
          <Zap className="w-3 h-3" />
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Shield className="w-3 h-3" />
          {prediction.reason}
          {prediction.deviceScore !== undefined && (
            <span className="opacity-60">• Device score: {prediction.deviceScore}/100</span>
          )}
        </p>
      </div>
    );
  }

  // Server mode
  return (
    <div className="flex flex-col items-center gap-2 mb-4 animate-in fade-in slide-in-from-top duration-500">
      <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400">
        <Cloud className="w-4 h-4" />
        <span>Will process on server</span>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Shield className="w-3 h-3" />
        {prediction.reason}
      </p>
    </div>
  );
});

/**
 * Props for FilesSelectedActions component
 */
interface FilesSelectedActionsProps {
  showAddMore: boolean;
  onAddMore: () => void;
  onProcess: () => void;
  actionText: string;
  color: string;
  processingPrediction?: ProcessingModePrediction | null;
}

/**
 * Actions displayed when files are selected (before processing)
 * Shows "Add more files" button (optional), processing mode indicator, and the main action button
 */
const FilesSelectedActions = React.memo(function FilesSelectedActions({
  showAddMore,
  onAddMore,
  onProcess,
  actionText,
  color,
  processingPrediction,
}: FilesSelectedActionsProps) {
  return (
    <div className="flex flex-col gap-4 justify-center pt-8 border-t w-full">
      {/* Processing mode indicator */}
      <ProcessingModeIndicator prediction={processingPrediction ?? null} />
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {showAddMore && (
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onAddMore}
            className="rounded-full h-12 px-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Add more files
          </Button>
        )}
        <Button 
          size="lg" 
          onClick={onProcess}
          className={cn(
            "rounded-full h-12 px-12 text-lg shadow-lg hover:scale-105 transition-transform", 
            color
          )}
        >
          {actionText} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
});

/**
 * Props for DownloadActions component
 */
interface DownloadActionsProps {
  onDownload: () => void;
  onBackToEdit: () => void;
  onStartOver: () => void;
  onDelete: () => void;
  /** Server result already downloaded and removed from the server. */
  alreadyDownloaded?: boolean;
  /** Result was produced in the browser and can be re-downloaded freely. */
  isClientSide?: boolean;
}

/**
 * Actions displayed after processing is complete
 * Shows download, back to edit, start over, and delete buttons
 */
const DownloadActions = React.memo(function DownloadActions({
  onDownload,
  onBackToEdit,
  onStartOver,
  onDelete,
  alreadyDownloaded = false,
  isClientSide = false,
}: DownloadActionsProps) {
  // A server-side file is deleted right after download and cannot be fetched
  // again. Swap the UI to reflect that instead of showing a dead button.
  if (alreadyDownloaded && !isClientSide) {
    return (
      <div>
        <h3 className="text-2xl font-bold mb-2">Downloaded</h3>
        <p className="text-muted-foreground mb-8">
          Your file was downloaded and removed from our servers for your privacy.
          It can no longer be downloaded — process it again if you need another copy.
        </p>

        <div className="space-y-4">
          <Button
            size="lg"
            onClick={onStartOver}
            className="w-full h-14 text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform bg-slate-900 hover:bg-slate-800"
            data-testid="button-start-over"
          >
            <Plus className="mr-2 h-5 w-5" /> Process a New File
          </Button>
          <Button
            variant="outline"
            onClick={onBackToEdit}
            className="w-full h-12 text-base rounded-xl border-2 hover:bg-slate-50"
            data-testid="button-back-to-edit"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Back to Edit Options
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-bold mb-2">Task Completed!</h3>
      <p className="text-muted-foreground mb-8">
        {isClientSide
          ? "Processed right in your browser — download it as many times as you like."
          : "Your files have been processed successfully."}
      </p>
      
      <div className="space-y-4">
        {/* Primary download button */}
        <Button 
          size="lg" 
          onClick={onDownload}
          className="w-full h-14 text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform bg-slate-900 hover:bg-slate-800"
          data-testid="button-download"
        >
          <Download className="mr-2 h-5 w-5" /> Download File
        </Button>
        
        {/* Back to edit button */}
        <Button 
          variant="outline" 
          onClick={onBackToEdit}
          className="w-full h-12 text-base rounded-xl border-2 hover:bg-slate-50"
          data-testid="button-back-to-edit"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Edit Options
        </Button>
        
        {/* Secondary actions row */}
        <div className="flex gap-4 justify-center pt-2">
          <Button variant="ghost" onClick={onStartOver} data-testid="button-start-over">
            <Plus className="mr-1 h-4 w-4" /> New File
          </Button>
          <Button 
            variant="ghost" 
            onClick={onDelete} 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            data-testid="button-delete"
          >
            <Trash2 className="mr-1 h-4 w-4" /> Delete File
          </Button>
        </div>
      </div>
    </div>
  );
});

/**
 * Props for ErrorActions component
 */
interface ErrorActionsProps {
  onTryAgain: () => void;
}

/**
 * Actions displayed when an error occurs
 * Shows a try again button to restart the process
 */
const ErrorActions = React.memo(function ErrorActions({ onTryAgain }: ErrorActionsProps) {
  return (
    <div className="space-y-4">
      <Button 
        size="lg" 
        onClick={onTryAgain}
        className="w-full h-14 text-lg rounded-xl"
        data-testid="button-try-again"
      >
        Try Again
      </Button>
    </div>
  );
});

/**
 * Props for CreateToolActions component - used by create-document, create-word, etc.
 */
interface CreateToolActionsProps {
  onProcess: () => void;
  disabled: boolean;
  actionText: string;
  color: string;
}

/**
 * Actions for document creation tools (no file upload needed)
 */
const CreateToolActions = React.memo(function CreateToolActions({
  onProcess,
  disabled,
  actionText,
  color,
}: CreateToolActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t w-full">
      <Button 
        size="lg" 
        onClick={onProcess}
        disabled={disabled}
        className={cn(
          "rounded-full h-12 px-12 text-lg shadow-lg hover:scale-105 transition-transform", 
          color
        )}
      >
        {actionText} <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
});

export { 
  FilesSelectedActions, 
  DownloadActions, 
  ErrorActions, 
  CreateToolActions 
};
export type { 
  FilesSelectedActionsProps, 
  DownloadActionsProps, 
  ErrorActionsProps, 
  CreateToolActionsProps 
};
