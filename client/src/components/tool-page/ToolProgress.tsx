import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, CheckCircle2, AlertCircle, Cpu, Zap, Shield, WifiOff } from "lucide-react";

/**
 * Props for the ToolProgress component
 */
interface ToolProgressProps {
  stage: "processing" | "download" | "error";
  progress: number;
  error: string | null;
  color: string;
  isClientSide?: boolean;
}

/**
 * Humorous messages for client-side processing
 */
const CLIENT_SIDE_MESSAGES = [
  "Your browser is flexing its muscles! 💪",
  "No servers were harmed in this operation 🌱",
  "Your files never left your device. Privacy win! 🔒",
  "Look ma, no internet needed! 🚀",
  "Your CPU is earning its electricity bill ⚡",
  "Processing locally... like a boss 😎",
  "Your browser: 'I got this!' 🦸",
  "Faster than sending to a server! 🏎️",
  "Zero upload time. You're welcome! ⏱️",
  "Your computer is doing the heavy lifting 🏋️",
];

/**
 * ToolProgress component displays the current processing state
 * including spinning animation during processing, success state,
 * and error state with appropriate visual feedback.
 * Now includes special display for client-side (browser) processing!
 */
const ToolProgress = React.memo(function ToolProgress({ 
  stage, 
  progress, 
  error, 
  color,
  isClientSide = false
}: ToolProgressProps) {
  // Rotate through humorous messages for client-side processing
  const [messageIndex, setMessageIndex] = useState(() => 
    Math.floor(Math.random() * CLIENT_SIDE_MESSAGES.length)
  );
  
  useEffect(() => {
    if (stage === "processing" && isClientSide) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % CLIENT_SIDE_MESSAGES.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [stage, isClientSide]);

  // Processing state - shows spinner with progress percentage
  if (stage === "processing") {
    return (
      <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Client-side badge */}
        {isClientSide && (
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-full px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-top duration-500">
            <Cpu className="w-4 h-4" />
            <span>Processing in your browser</span>
            <WifiOff className="w-3 h-3 opacity-60" />
          </div>
        )}
        
        {/* Spinning progress indicator */}
        <div className="relative w-24 h-24 mx-auto">
          {isClientSide ? (
            <>
              {/* Special animation for client-side */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 animate-pulse" />
              <Zap 
                className={cn(
                  "w-full h-full text-emerald-500 animate-pulse"
                )} 
              />
            </>
          ) : (
            <RefreshCw 
              className={cn(
                "w-full h-full animate-spin text-slate-200", 
                color.replace('bg-', 'text-')
              )} 
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
            {Math.round(progress)}%
          </div>
        </div>
        
        {/* Processing message */}
        <div>
          <h3 className="text-2xl font-bold mb-2">
            {isClientSide ? "Local Processing" : "Processing..."}
          </h3>
          {isClientSide ? (
            <p className="text-muted-foreground min-h-[1.5rem] transition-all duration-300">
              {CLIENT_SIDE_MESSAGES[messageIndex]}
            </p>
          ) : (
            <p className="text-muted-foreground">Hold tight, this won't take long.</p>
          )}
        </div>
        
        {/* Progress bar */}
        <Progress 
          value={progress} 
          className={cn("h-3", isClientSide && "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500")} 
        />
        
        {/* Privacy note for client-side */}
        {isClientSide && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-in fade-in duration-1000 delay-500">
            <Shield className="w-3 h-3" />
            <span>Your files stay on your device - nothing uploaded to servers</span>
          </div>
        )}
      </div>
    );
  }

  // Success state - shows checkmark with optional client-side badge
  if (stage === "download") {
    return (
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-24 h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={48} strokeWidth={2} />
        </div>
        
        {/* Client-side processing badge */}
        {isClientSide && (
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in slide-in-from-bottom duration-500">
            <Cpu className="w-3 h-3" />
            <span>Processed locally in your browser</span>
            <Shield className="w-3 h-3" />
          </div>
        )}
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
