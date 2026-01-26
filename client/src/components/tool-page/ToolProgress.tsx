import React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Props for the ToolProgress component
 */
interface ToolProgressProps {
  stage: "processing" | "download" | "error";
  progress: number;
  error: string | null;
  color: string;
}

/**
 * ToolProgress component displays the current processing state
 * including spinning animation during processing, success state,
 * and error state with appropriate visual feedback.
 */
const ToolProgress = React.memo(function ToolProgress({ 
  stage, 
  progress, 
  error, 
  color 
}: ToolProgressProps) {
  // Processing state - shows spinner with progress percentage
  if (stage === "processing") {
    return (
      <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Spinning progress indicator */}
        <div className="relative w-24 h-24 mx-auto">
          <RefreshCw 
            className={cn(
              "w-full h-full animate-spin text-slate-200", 
              color.replace('bg-', 'text-')
            )} 
          />
          <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
            {Math.round(progress)}%
          </div>
        </div>
        
        {/* Processing message */}
        <div>
          <h3 className="text-2xl font-bold mb-2">Processing...</h3>
          <p className="text-muted-foreground">Hold tight, this won't take long.</p>
        </div>
        
        {/* Progress bar */}
        <Progress value={progress} className="h-3" />
      </div>
    );
  }

  // Success state - shows checkmark
  if (stage === "download") {
    return (
      <div className="w-24 h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 size={48} strokeWidth={2} />
      </div>
    );
  }

  // Error state - shows alert icon
  if (stage === "error") {
    return (
      <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={48} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">Oops! Something went wrong</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return null;
});

export { ToolProgress };
export type { ToolProgressProps };
