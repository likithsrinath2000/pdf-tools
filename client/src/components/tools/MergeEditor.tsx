import { Reorder } from "framer-motion";
import { FileText, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MergeEditorProps {
  files: File[];
  onReorder: (files: File[]) => void;
  onRemove: (index: number) => void;
}

export function MergeEditor({ files, onReorder, onRemove }: MergeEditorProps) {
  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-lg font-semibold mb-4 text-center text-muted-foreground">
        Drag and drop to reorder your files
      </h3>
      
      <Reorder.Group axis="y" values={files} onReorder={onReorder} className="space-y-3">
        {files.map((file) => (
          <Reorder.Item key={file.name} value={file}>
            <div className="bg-white border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
              <div className="text-slate-400">
                <GripVertical size={20} />
              </div>
              
              <div className="w-12 h-16 bg-red-50 border border-red-100 rounded flex items-center justify-center text-red-500 shadow-sm relative overflow-hidden">
                <FileText size={24} />
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-transparent border-r-red-200" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-slate-700">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent drag start
                  onRemove(files.indexOf(file));
                }}
                className="text-slate-400 hover:text-destructive hover:bg-red-50"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
