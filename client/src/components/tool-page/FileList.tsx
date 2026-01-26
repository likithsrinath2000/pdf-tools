import React from "react";
import { Button } from "@/components/ui/button";
import { File as FileIcon, Trash2 } from "lucide-react";

/**
 * Props for the FileList component
 */
interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

/**
 * FileList component displays a scrollable list of selected files
 * with preview thumbnails and remove buttons. Uses React.memo for
 * performance optimization when re-rendering.
 */
const FileList = React.memo(function FileList({ files, onRemove }: FileListProps) {
  return (
    <div className="grid gap-4 w-full max-w-2xl max-h-[400px] overflow-y-auto p-2">
      {files.map((file, i) => (
        <div 
          key={i} 
          className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border group hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            {/* File thumbnail/icon */}
            <div className="w-12 h-12 rounded-lg bg-white border flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              {file.type.includes('image') ? (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <FileIcon size={24} className="text-red-500" />
              )}
            </div>
            
            {/* File info */}
            <div className="min-w-0">
              <p className="font-medium truncate text-slate-700">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          {/* Remove button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onRemove(i)} 
            className="text-slate-400 hover:text-destructive"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      ))}
    </div>
  );
});

export { FileList };
export type { FileListProps };
