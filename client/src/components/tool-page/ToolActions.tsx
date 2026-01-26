import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Download, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Plus 
} from "lucide-react";

/**
 * Props for FilesSelectedActions component
 */
interface FilesSelectedActionsProps {
  showAddMore: boolean;
  onAddMore: () => void;
  onProcess: () => void;
  actionText: string;
  color: string;
}

/**
 * Actions displayed when files are selected (before processing)
 * Shows "Add more files" button (optional) and the main action button
 */
const FilesSelectedActions = React.memo(function FilesSelectedActions({
  showAddMore,
  onAddMore,
  onProcess,
  actionText,
  color,
}: FilesSelectedActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t w-full">
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
}: DownloadActionsProps) {
  return (
    <div>
      <h3 className="text-2xl font-bold mb-2">Task Completed!</h3>
      <p className="text-muted-foreground mb-8">Your files have been processed successfully.</p>
      
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
